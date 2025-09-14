import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItemOption";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Add a new cart item option (ai_commerce_cart_item_options) for a specific
 * cart.
 *
 * Buyers can add a new option to a cart item (such as color or size) by posting
 * to their cart's itemOptions subroute. This operation ensures that only the
 * owner of the cart may perform this action, that the cart is active and not
 * deleted, and that the option parameters are valid in context of the cart's
 * ownership. On success, returns the newly created cart item option object.
 *
 * @param props - The input properties for this operation
 * @param props.buyer - Authenticated buyer (must own cart)
 * @param props.cartId - Identifier of the cart to which the option is added
 * @param props.body - IAiCommerceCartItemOption.ICreate object containing
 *   option name, value, and target cart item
 * @returns The newly created cart item option as IAiCommerceCartItemOption
 * @throws {Error} If cart item or cart does not exist, is deleted, is not
 *   owned, or business rule violated
 */
export async function postaiCommerceBuyerCartsCartIdItemOptions(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItemOption.ICreate;
}): Promise<IAiCommerceCartItemOption> {
  const { buyer, cartId, body } = props;

  // Step 1: Ensure the cart item exists and is part of the specified cart
  const cartItem = await MyGlobal.prisma.ai_commerce_cart_items.findUnique({
    where: { id: body.cart_item_id },
    select: { cart_id: true },
  });
  if (!cartItem) {
    throw new Error("Cart item does not exist");
  }
  if (cartItem.cart_id !== cartId) {
    throw new Error("Cart item is not part of the specified cart");
  }

  // Step 2: Ensure the cart is active, not deleted, and owned by the buyer
  const cart = await MyGlobal.prisma.ai_commerce_carts.findUnique({
    where: { id: cartId },
    select: { buyer_id: true, status: true, deleted_at: true },
  });
  if (!cart || cart.deleted_at !== null) {
    throw new Error("Cart does not exist or is deleted");
  }
  if (cart.buyer_id !== buyer.id) {
    throw new Error("Only the owner can modify this cart");
  }
  if (cart.status !== "active") {
    throw new Error("Cannot modify a non-active cart");
  }

  // Step 3: Generate the id and created_at fields
  const id = v4();
  const created_at = toISOStringSafe(new Date());

  // Step 4: Create the new cart item option
  const created = await MyGlobal.prisma.ai_commerce_cart_item_options.create({
    data: {
      id,
      cart_item_id: body.cart_item_id,
      option_name: body.option_name,
      option_value: body.option_value,
      created_at,
    },
    select: {
      id: true,
      cart_item_id: true,
      option_name: true,
      option_value: true,
      created_at: true,
    },
  });

  // Step 5: Return the formatted DTO
  return {
    id: created.id,
    cart_item_id: created.cart_item_id,
    option_name: created.option_name,
    option_value: created.option_value,
    created_at: created.created_at,
  };
}
