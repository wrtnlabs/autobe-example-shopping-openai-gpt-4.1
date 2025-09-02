import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve the full details of a single item inside a specific shopping cart.
 *
 * This operation is typically used by customers examining their cart prior to
 * checkout or by support/admin personnel for order troubleshooting. Access
 * controls ensure only cart owners or authorized roles can access the item
 * details.
 *
 * @param props - The request parameters and authenticated customer
 * @param props.customer - The authenticated customer (authorization required)
 * @param props.cartId - The unique identifier of the cart holding the item
 *   (UUID)
 * @param props.itemId - The unique identifier of the item to view inside the
 *   cart (UUID)
 * @returns The full details of the specified cart item, mapped to the external
 *   DTO
 * @throws {Error} If cart item does not exist, is deleted, or does not belong
 *   to the customer (unauthorized)
 */
export async function get__shoppingMallAiBackend_customer_carts_$cartId_items_$itemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCartItem> {
  const { customer, cartId, itemId } = props;
  // Find cart item matching both the item ID and the cart ID, not soft deleted
  const cartItem =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_cart_id: cartId,
        deleted_at: null,
      },
      include: {
        cart: true,
      },
    });
  if (!cartItem) {
    throw new Error("Cart item not found or deleted");
  }
  // Only the owner of the cart can access the item's detail
  if (
    !cartItem.cart ||
    cartItem.cart.shopping_mall_ai_backend_customer_id !== customer.id
  ) {
    throw new Error("Unauthorized: You do not own this cart item");
  }
  return {
    id: cartItem.id,
    shopping_mall_ai_backend_cart_id: cartItem.shopping_mall_ai_backend_cart_id,
    shopping_mall_ai_backend_product_snapshot_id:
      cartItem.shopping_mall_ai_backend_product_snapshot_id,
    quantity: cartItem.quantity,
    option_code: cartItem.option_code,
    bundle_code: cartItem.bundle_code ?? null,
    note: cartItem.note ?? null,
    created_at: toISOStringSafe(cartItem.created_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    deleted_at: cartItem.deleted_at
      ? toISOStringSafe(cartItem.deleted_at)
      : null,
  };
}
