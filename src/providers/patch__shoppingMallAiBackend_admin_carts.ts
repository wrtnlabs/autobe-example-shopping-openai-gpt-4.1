import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and paginate shopping carts with flexible query options.
 *
 * This endpoint enables clients to search, filter, and paginate the list of
 * shopping carts within the ShoppingMallAiBackend system. It processes search
 * parameters, cart status filters, sorting, and pagination controls provided in
 * the request body. Typical use-cases include customer account review, active
 * cart management, or analytics dashboards for operations managers. The request
 * and response types follow the standardized shoppingMallAiBackend naming
 * conventions for complex search operations.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated AdminPayload required for authorization
 * @param props.body - Query and filter options for cart search/pagination
 *   (status, customer_id, session_id, note_search, created_at_min/max,
 *   sort_field, sort_order, page, limit)
 * @returns IPageIShoppingMallAiBackendCart.ISummary: Paginated list of carts
 *   matching filter/search criteria, with accurate pagination meta
 * @throws {Error} When authorization is missing or invalid
 * @throws {Error} When invalid page/limit is specified
 */
export async function patch__shoppingMallAiBackend_admin_carts(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCart.IRequest;
}): Promise<IPageIShoppingMallAiBackendCart.ISummary> {
  const { admin, body } = props;
  if (!admin) throw new Error("Admin authentication required");

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1 || limit < 1) throw new Error("Invalid pagination parameters");

  // Whitelist and apply sort field
  const allowedSortFields = ["created_at", "updated_at", "status"];
  const sortField =
    body.sort_field && allowedSortFields.includes(body.sort_field)
      ? body.sort_field
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Inline where/orderBy for type safety
  const [carts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_carts.findMany({
      where: {
        deleted_at: null,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.customer_id !== undefined && {
          shopping_mall_ai_backend_customer_id: body.customer_id,
        }),
        ...(body.session_id !== undefined && {
          shopping_mall_ai_backend_customer_session_id: body.session_id,
        }),
        ...(body.note_search !== undefined &&
          body.note_search !== null && {
            note: { contains: body.note_search, mode: "insensitive" as const },
          }),
        ...((body.created_at_min !== undefined &&
          body.created_at_min !== null) ||
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
      },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_carts.count({
      where: {
        deleted_at: null,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.customer_id !== undefined && {
          shopping_mall_ai_backend_customer_id: body.customer_id,
        }),
        ...(body.session_id !== undefined && {
          shopping_mall_ai_backend_customer_session_id: body.session_id,
        }),
        ...(body.note_search !== undefined &&
          body.note_search !== null && {
            note: { contains: body.note_search, mode: "insensitive" as const },
          }),
        ...((body.created_at_min !== undefined &&
          body.created_at_min !== null) ||
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
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: carts.map((cart) => ({
      id: cart.id,
      cart_token: cart.cart_token,
      status: cart.status,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      customer_id: cart.shopping_mall_ai_backend_customer_id ?? null,
      note: cart.note ?? null,
      expires_at: cart.expires_at ? toISOStringSafe(cart.expires_at) : null,
    })),
  };
}
