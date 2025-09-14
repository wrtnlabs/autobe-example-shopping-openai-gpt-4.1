import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItemOption";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update a cart item option (ai_commerce_cart_item_options) in a specific cart.
 *
 * This endpoint allows buyers to update a cart item option row by its optionId,
 * ensuring the new data is valid for the corresponding item/product and the
 * buyer owns the cart. It performs strict access control: verifies presence,
 * matches the correct cart, confirms buyer ownership, and then applies
 * option_name/option_value updates according to request. Returns the fully
 * updated item option record as per schema.
 *
 * @param props - Object containing:
 * @returns The fully updated cart item option (IAiCommerceCartItemOption)
 * @throws {Error} If the option, cart item, or cart does not exist, ownership
 *   fails, or cartId does not match
 * @field buyer - The authenticated buyer's payload (authorization context)
 * @field cartId - UUID for the cart containing the option
 * @field itemOptionId - UUID for the cart item option to update
 * @field body - Patchable fields (option_name, option_value)
 */
export async function putaiCommerceBuyerCartsCartIdItemOptionsItemOptionId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  itemOptionId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItemOption.IUpdate;
}): Promise<IAiCommerceCartItemOption> {
  const { buyer, cartId, itemOptionId, body } = props;
  // Step 1: Fetch the option, join up to cart for ownership validation
  const option = await MyGlobal.prisma.ai_commerce_cart_item_options.findUnique(
    {
      where: { id: itemOptionId },
      include: {
        cartItem: {
          include: {
            cart: true,
          },
        },
      },
    },
  );
  if (!option || !option.cartItem || !option.cartItem.cart)
    throw new Error("Cart item option not found");
  if (option.cartItem.cart.id !== cartId)
    throw new Error("Cart ID does not match");
  if (option.cartItem.cart.buyer_id !== buyer.id)
    throw new Error("Buyer does not own this cart");

  // Step 2: Build update patch from provided body
  const data: { option_name?: string; option_value?: string } = {};
  if (typeof body.option_name === "string") data.option_name = body.option_name;
  if (typeof body.option_value === "string")
    data.option_value = body.option_value;

  const updated = await MyGlobal.prisma.ai_commerce_cart_item_options.update({
    where: { id: itemOptionId },
    data,
  });
  return {
    id: updated.id,
    cart_item_id: updated.cart_item_id,
    option_name: updated.option_name,
    option_value: updated.option_value,
    created_at: toISOStringSafe(updated.created_at),
  };
}
