import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Paginate and filter items inside a shopping cart by cartId
 *
 * This operation provides a paginated view of items within a specific shopping
 * cart, identified by cartId. The endpoint supports searching, filtering on
 * item attributes, and pagination. It is used by customers to review the
 * detailed contents of their cart or by admins performing support or analytics
 * tasks. The results present item attributes together with relevant metadata
 * and references to product snapshots for audit purposes.
 *
 * @param props - Request properties, must include: seller: Authenticated seller
 *   payload (enforced via SellerAuth decorator) cartId: Unique identifier of
 *   the cart whose items are being listed (UUID) body: Query and pagination
 *   configuration for cart items listing
 * @returns Paginated data of cart items belonging to specified cart
 * @throws {Error} When the cart does not exist, is deleted, or access is denied
 */
export async function patch__shoppingMallAiBackend_seller_carts_$cartId_items(props: {
  seller: SellerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCartItem.IRequest;
}): Promise<IPageIShoppingMallAiBackendCartItem> {
  const { cartId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build quantity filter (supports min and max, may be both, only one, or none)
  let quantityFilter: Record<string, unknown> | undefined = undefined;
  if (body.quantity_min !== undefined && body.quantity_max !== undefined) {
    quantityFilter = { gte: body.quantity_min, lte: body.quantity_max };
  } else if (body.quantity_min !== undefined) {
    quantityFilter = { gte: body.quantity_min };
  } else if (body.quantity_max !== undefined) {
    quantityFilter = { lte: body.quantity_max };
  }

  // Build created_at date range
  let createdAtFilter: Record<string, unknown> | undefined = undefined;
  if (body.created_at_min !== undefined && body.created_at_max !== undefined) {
    createdAtFilter = { gte: body.created_at_min, lte: body.created_at_max };
  } else if (body.created_at_min !== undefined) {
    createdAtFilter = { gte: body.created_at_min };
  } else if (body.created_at_max !== undefined) {
    createdAtFilter = { lte: body.created_at_max };
  }

  const where = {
    shopping_mall_ai_backend_cart_id: cartId,
    deleted_at: null,
    ...(quantityFilter && { quantity: quantityFilter }),
    ...(body.bundle_code !== undefined &&
      body.bundle_code !== null && {
        bundle_code: body.bundle_code,
      }),
    ...(body.note_search !== undefined &&
      body.note_search !== null && {
        note: { contains: body.note_search, mode: "insensitive" as const },
      }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
  };

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort_field && body.sort_order) {
    orderBy = { [body.sort_field]: body.sort_order };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.count({ where }),
  ]);

  const data = rows.map((item) => ({
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
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
