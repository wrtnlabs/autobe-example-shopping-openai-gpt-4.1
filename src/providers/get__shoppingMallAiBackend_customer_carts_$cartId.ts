import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve the details of a specific shopping cart by unique cartId.
 *
 * This function fetches a shopping cart from the ShoppingMallAiBackend system
 * by its ID, ensuring the user is authenticated as the cart owner (customer).
 * Only the customer who owns the cart may access its details; all other access
 * is forbidden. All date and time fields are properly serialized as string &
 * tags.Format<'date-time'>, and ownership is strictly enforced. Throws
 * descriptive errors when not found or unauthorized.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer payload (id, type)
 * @param props.cartId - Unique identifier of the cart (UUID)
 * @returns Complete shopping cart object with all metadata and correct types
 * @throws {Error} When the cart is not found or is not owned by the
 *   authenticated customer
 */
export async function get__shoppingMallAiBackend_customer_carts_$cartId(props: {
  customer: { id: string & tags.Format<"uuid">; type: "customer" };
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCart> {
  const { customer, cartId } = props;

  // Fetch cart info (must not be soft-deleted)
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
  });
  if (!cart) throw new Error("Cart not found");

  // Authorization: only owner can view
  if (cart.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this cart");
  }

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
