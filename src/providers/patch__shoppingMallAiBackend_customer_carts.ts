import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search, filter, and paginate shopping carts with flexible query options.
 *
 * This endpoint enables authenticated customers to search and filter their
 * shopping carts in the ShoppingMallAiBackend system using flexible filters for
 * status, date range, note/content search, and pagination. Carts are always
 * restricted to the calling customer and logically deleted carts are not
 * returned. Supports standard pagination and sorting fields.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer payload
 * @param props.body - Query and filter options for cart search
 * @returns Paginated summary records of shopping carts for current customer
 *   matching filter criteria
 * @throws {Error} If authentication is invalid or internal errors occur
 */
export async function patch__shoppingMallAiBackend_customer_carts(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendCart.IRequest;
}): Promise<IPageIShoppingMallAiBackendCart.ISummary> {
  const { customer, body } = props;

  // 1. Pagination params (defaults)
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit = body.limit && body.limit > 0 ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // 2. Sorting params (restrict to allowed fields)
  const allowedSortFields = ["created_at", "updated_at", "status"];
  const sort_field = allowedSortFields.includes(
    (body.sort_field || "").toLowerCase(),
  )
    ? (body.sort_field?.toLowerCase() as "created_at" | "updated_at" | "status")
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // 3. Build Prisma where filter inline (no intermediate var)
  const where = {
    deleted_at: null,
    shopping_mall_ai_backend_customer_id: customer.id,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.session_id !== undefined &&
      body.session_id !== null && {
        shopping_mall_ai_backend_customer_session_id: body.session_id,
      }),
    ...(body.note_search !== undefined &&
      body.note_search !== null && {
        note: { contains: body.note_search, mode: "insensitive" as const },
      }),
    ...(body.created_at_min || body.created_at_max
      ? {
          created_at: {
            ...(body.created_at_min !== undefined &&
              body.created_at_min !== null && {
                gte: body.created_at_min,
              }),
            ...(body.created_at_max !== undefined &&
              body.created_at_max !== null && {
                lte: body.created_at_max,
              }),
          },
        }
      : {}),
  };

  // 4. Parallel fetch: data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_carts.findMany({
      where,
      orderBy: { [sort_field]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_carts.count({ where }),
  ]);

  // 5. Map to ISummary (convert all Date fields properly, never use native Date type)
  const data = rows.map(
    (cart): IShoppingMallAiBackendCart.ISummary => ({
      id: cart.id,
      cart_token: cart.cart_token,
      status: cart.status,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      customer_id: cart.shopping_mall_ai_backend_customer_id ?? null,
      note: cart.note ?? null,
      expires_at: cart.expires_at ? toISOStringSafe(cart.expires_at) : null,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
