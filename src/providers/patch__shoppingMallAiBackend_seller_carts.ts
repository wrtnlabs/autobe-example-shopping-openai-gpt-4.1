import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search, filter, and paginate shopping carts with flexible query options.
 *
 * This endpoint enables clients to search, filter, and paginate the list of
 * shopping carts within the ShoppingMallAiBackend system. Typical use-cases
 * include customer account review, active cart management, or analytics
 * dashboards for operations managers. The request and response types follow the
 * standardized shoppingMallAiBackend naming conventions for complex search
 * operations.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the search
 *   (authorization enforced by decorator)
 * @param props.body - Query and filter options for carts search/pagination
 * @returns Paginated list of carts matching filter/search criteria
 * @throws {Error} If a database or internal error occurs
 */
export async function patch__shoppingMallAiBackend_seller_carts(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendCart.IRequest;
}): Promise<IPageIShoppingMallAiBackendCart.ISummary> {
  const { body } = props;

  // Only allow sorting by these fields for type safety and business logic
  const allowedSortFields = ["created_at", "updated_at", "status"];
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  const orderField = allowedSortFields.includes(body.sort_field || "")
    ? body.sort_field!
    : "created_at";
  const orderDir = body.sort_order === "asc" ? "asc" : "desc";

  // Build dynamic where clause with proper undefined/null normalization
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_ai_backend_customer_id: body.customer_id,
      }),
    ...(body.session_id !== undefined &&
      body.session_id !== null && {
        shopping_mall_ai_backend_customer_session_id: body.session_id,
      }),
    ...(body.note_search !== undefined &&
      body.note_search !== null && {
        note: { contains: body.note_search, mode: "insensitive" as const },
      }),
    ...((body.created_at_min !== undefined && body.created_at_min !== null) ||
    (body.created_at_max !== undefined && body.created_at_max !== null)
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

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_carts.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_carts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((cart) => ({
      id: cart.id,
      cart_token: cart.cart_token,
      status: cart.status,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      customer_id: cart.shopping_mall_ai_backend_customer_id ?? null,
      note: cart.note ?? null,
      expires_at:
        cart.expires_at !== null && cart.expires_at !== undefined
          ? toISOStringSafe(cart.expires_at)
          : null,
    })),
  };
}
