import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginate and filter items inside a shopping cart by cartId.
 *
 * This operation provides a paginated view of items within a specific shopping
 * cart, identified by cartId. The endpoint supports searching, filtering on
 * item attributes, and pagination. It is used by customers to review the
 * detailed contents of their cart or by admins performing support or analytics
 * tasks. The results present item attributes together with relevant metadata
 * and references to product snapshots for audit purposes.
 *
 * @param props - Function arguments
 * @param props.admin - Admin making the request; must be authenticated via
 *   AdminPayload.
 * @param props.cartId - Unique identifier of the cart whose items are being
 *   listed (UUID).
 * @param props.body - Query and pagination configuration for cart items listing
 * @returns Paginated data of cart items belonging to specified cart
 * @throws {Error} If the specified cart does not exist or has been deleted.
 */
export async function patch__shoppingMallAiBackend_admin_carts_$cartId_items(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCartItem.IRequest;
}): Promise<IPageIShoppingMallAiBackendCartItem> {
  const { cartId, body } = props;
  // Fetch the referenced cart, error if not found or soft-deleted
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: { id: cartId, deleted_at: null },
    select: { id: true },
  });
  if (!cart) {
    throw new Error("Cart not found or deleted");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Compose filters using only schema fields
  const where = {
    shopping_mall_ai_backend_cart_id: cartId,
    deleted_at: null,
    ...(body.quantity_min !== undefined &&
      body.quantity_min !== null && { quantity: { gte: body.quantity_min } }),
    ...(body.quantity_max !== undefined &&
      body.quantity_max !== null && { quantity: { lte: body.quantity_max } }),
    ...(body.bundle_code !== undefined &&
      body.bundle_code !== null && { bundle_code: body.bundle_code }),
    ...(body.note_search !== undefined &&
      body.note_search !== null && {
        note: { contains: body.note_search, mode: "insensitive" as const },
      }),
    ...((body.created_at_min !== undefined && body.created_at_min !== null) ||
    (body.created_at_max !== undefined && body.created_at_max !== null)
      ? {
          created_at: {
            ...(body.created_at_min !== undefined &&
              body.created_at_min !== null && { gte: body.created_at_min }),
            ...(body.created_at_max !== undefined &&
              body.created_at_max !== null && { lte: body.created_at_max }),
          },
        }
      : {}),
  };
  const sortField = body.sort_field ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";
  // Query in parallel
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.count({ where }),
  ]);
  // Transform all date fields to correct branded type
  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_ai_backend_cart_id: item.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      item.shopping_mall_ai_backend_product_snapshot_id,
    quantity: item.quantity,
    option_code: item.option_code,
    bundle_code: item.bundle_code ?? null,
    note: item.note ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: total === 0 ? 0 : Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
