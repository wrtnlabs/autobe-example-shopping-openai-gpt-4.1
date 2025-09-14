import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItemOption";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get details for a specific cart item option (ai_commerce_cart_item_options)
 * by ID.
 *
 * This operation retrieves details for a single cart item option row for a
 * buyer (by cartId and itemOptionId). It supports review, editing, or further
 * item operations. It applies strict buyer-role access.
 *
 * A buyer can look up details for a specific item option in their cart by
 * providing both the parent cartId and optionId. The handler validates cart
 * existence, option presence, and buyer ownership. Returns full option data if
 * found and accessible. Denies or errors if the references are invalid, item is
 * deleted, or the buyer is unauthorized. All structure, access, and output
 * types match schema requirements.
 *
 * @param props - Request object containing:
 *
 *   - Buyer: BuyerPayload (injected authenticated buyer identity)
 *   - CartId: string & tags.Format<'uuid'>; (the cart in which the item option is
 *       located)
 *   - ItemOptionId: string & tags.Format<'uuid'>; (the option row to fetch details
 *       on)
 *
 * @returns The cart item option detail matching IAiCommerceCartItemOption
 * @throws {Error} When item option does not exist, is not in the cart
 *   requested, or does not belong to this buyer's cart
 */
export async function getaiCommerceBuyerCartsCartIdItemOptionsItemOptionId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  itemOptionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCartItemOption> {
  // Fetch the option row, join to item and cart to validate ownership and cart relation
  const optionRow =
    await MyGlobal.prisma.ai_commerce_cart_item_options.findFirst({
      where: { id: props.itemOptionId },
      include: { cartItem: { include: { cart: true } } },
    });
  if (!optionRow) {
    throw new Error("Cart item option not found");
  }
  if (!optionRow.cartItem) {
    throw new Error("Cart item for option not found");
  }
  const cart = optionRow.cartItem.cart;
  if (!cart) {
    throw new Error("Cart for item option not found");
  }
  // Ensure option belongs to the given cart
  if (cart.id !== props.cartId) {
    throw new Error("Unauthorized: option does not belong to requested cart");
  }
  // Ensure cart belongs to this buyer
  if (cart.buyer_id !== props.buyer.id) {
    throw new Error("Unauthorized: not your cart");
  }
  // Shape and return data, convert created_at to ISO string (never use Date, no type casts)
  return {
    id: optionRow.id,
    cart_item_id: optionRow.cart_item_id,
    option_name: optionRow.option_name,
    option_value: optionRow.option_value,
    created_at: toISOStringSafe(optionRow.created_at),
  };
}
