import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve details of a single shopping cart by cartId.
 *
 * This endpoint allows an authenticated seller to fetch the complete details of
 * a shopping cart by its unique cartId. The returned object includes metadata,
 * customer/session ownership, business status, and timestamps. Only carts not
 * soft deleted (deleted_at is null) may be accessed. Authorization is based on
 * system design; currently, carts are accessible by ID to all authenticated
 * sellers (see note in plan regarding schema limitations).
 *
 * @param props - Seller: SellerPayload - The authenticated seller account
 *   making the request. cartId: string (uuid) - The unique identifier of the
 *   cart to retrieve.
 * @returns Complete IShoppingMallAiBackendCart object with all metadata fields
 *   populated.
 * @throws {Error} When the cart does not exist or is soft-deleted (not found).
 */
export async function get__shoppingMallAiBackend_seller_carts_$cartId(props: {
  seller: SellerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCart> {
  const { cartId } = props;
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: { id: cartId, deleted_at: null },
  });
  if (!cart) throw new Error("Cart not found");
  return {
    id: cart.id,
    shopping_mall_ai_backend_customer_id:
      cart.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_customer_session_id:
      cart.shopping_mall_ai_backend_customer_session_id,
    cart_token: cart.cart_token,
    status: cart.status,
    expires_at: cart.expires_at ? toISOStringSafe(cart.expires_at) : null,
    last_merged_at: cart.last_merged_at
      ? toISOStringSafe(cart.last_merged_at)
      : null,
    note: cart.note ?? null,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at: cart.deleted_at ? toISOStringSafe(cart.deleted_at) : null,
  };
}
