import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

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
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload (must own the cart)
 * @param props.cartId - Unique identifier of the cart to paginate (UUID)
 * @param props.body - Query and pagination configuration for cart item listing
 * @returns Paginated data of cart items belonging to specified cart
 * @throws {Error} If cart does not exist, is deleted, or is not owned by
 *   customer
 */
export async function patch__shoppingMallAiBackend_customer_carts_$cartId_items(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCartItem.IRequest;
}): Promise<IPageIShoppingMallAiBackendCartItem> {
  const { customer, cartId, body } = props;
  // 1. Enforce ownership: fetch cart and confirm ownership
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: { id: cartId, deleted_at: null },
  });
  if (!cart || cart.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You cannot access this cart");
  }
  // 2. Pagination logic
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 10;
  // 3. Build where clause
  const where = {
    deleted_at: null,
    shopping_mall_ai_backend_cart_id: cartId,
    ...(body.quantity_min !== undefined &&
      body.quantity_min !== null && {
        quantity: { gte: body.quantity_min },
      }),
    ...(body.quantity_max !== undefined &&
      body.quantity_max !== null && {
        // Merge with quantity_min if present to build a range
        quantity: Object.assign(
          {},
          body.quantity_min !== undefined && body.quantity_min !== null
            ? { gte: body.quantity_min }
            : {},
          { lte: body.quantity_max },
        ),
      }),
    ...(body.bundle_code !== undefined &&
      body.bundle_code !== null && {
        bundle_code: body.bundle_code,
      }),
    ...(body.note_search !== undefined &&
      body.note_search !== null &&
      body.note_search.length > 0 && {
        note: { contains: body.note_search, mode: "insensitive" as const },
      }),
    ...(body.created_at_min !== undefined &&
      body.created_at_min !== null &&
      body.created_at_max !== undefined &&
      body.created_at_max !== null && {
        created_at: {
          gte: body.created_at_min,
          lte: body.created_at_max,
        },
      }),
    ...(body.created_at_min !== undefined &&
      body.created_at_min !== null &&
      (body.created_at_max === undefined || body.created_at_max === null) && {
        created_at: { gte: body.created_at_min },
      }),
    ...(body.created_at_max !== undefined &&
      body.created_at_max !== null &&
      (body.created_at_min === undefined || body.created_at_min === null) && {
        created_at: { lte: body.created_at_max },
      }),
  };
  // 4. Sorting logic
  const allowedSortFields = ["created_at", "quantity"] as const;
  const sortField =
    body.sort_field &&
    allowedSortFields.includes(
      body.sort_field as (typeof allowedSortFields)[number],
    )
      ? body.sort_field
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  // 5. Database read: paginate (skip/take)
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_cart_items.count({ where }),
  ]);
  // 6. Map to DTO, converting dates
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: items.map((item) => ({
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
    })),
  };
}
