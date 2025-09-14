import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get a single cart item detail (ai_commerce_cart_items) by cartId/itemId.
 *
 * Returns a detailed record for one cart item, by cartId and cartItemId.
 * Includes product/variant data, selected options, pricing at time of addition,
 * quantity, and audit timestamps. Owner (buyer) can fetch only their own cart's
 * item.
 *
 * @param props - Properties for the operation
 * @param props.buyer - The authenticated buyer (must be cart owner)
 * @param props.cartId - UUID of the cart to search
 * @param props.cartItemId - UUID of the cart item to fetch
 * @returns Full cart item details including options, enforcing owner/soft
 *   delete rules
 * @throws {Error} If cart is not found or buyer does not own cart
 * @throws {Error} If cart item is not found
 */
export async function getaiCommerceBuyerCartsCartIdItemsCartItemId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartItem> {
  const { buyer, cartId, cartItemId } = props;

  // 1. Ownership & existence validation for cart (only active, owned carts)
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new Error("Cart not found or does not belong to this buyer");
  }

  // 2. Fetch non-deleted cart item within that cart
  const cartItem = await MyGlobal.prisma.ai_commerce_cart_items.findFirst({
    where: {
      id: cartItemId,
      cart_id: cartId,
      deleted_at: null,
    },
  });
  if (!cartItem) {
    throw new Error("Cart item not found in the cart");
  }

  // 3. Fetch related options
  const options = await MyGlobal.prisma.ai_commerce_cart_item_options.findMany({
    where: { cart_item_id: cartItemId },
    orderBy: { created_at: "asc" },
  });

  // 4. Format options per IAiCommerceCartItemOption contract
  const formattedOptions =
    options.length > 0
      ? options.map((option) => ({
          id: option.id,
          cart_item_id: option.cart_item_id,
          option_name: option.option_name,
          option_value: option.option_value,
          created_at: toISOStringSafe(option.created_at),
        }))
      : undefined;

  // 5. Assemble and return IAiCommerceCartItem (strict typing, no type assertion)
  return {
    id: cartItem.id,
    cart_id: cartItem.cart_id,
    product_id: cartItem.product_id,
    variant_id:
      cartItem.variant_id !== null && cartItem.variant_id !== undefined
        ? cartItem.variant_id
        : undefined,
    quantity: cartItem.quantity,
    unit_price: cartItem.unit_price,
    item_total: cartItem.item_total,
    added_at: toISOStringSafe(cartItem.added_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    deleted_at:
      cartItem.deleted_at !== null && cartItem.deleted_at !== undefined
        ? toISOStringSafe(cartItem.deleted_at)
        : undefined,
    options: formattedOptions,
  };
}
