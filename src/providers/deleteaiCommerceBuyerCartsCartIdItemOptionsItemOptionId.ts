import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove (delete) a cart item option (ai_commerce_cart_item_options) from a
 * cart.
 *
 * Buyers may delete a previously chosen cart item option by providing the
 * cartId and itemOptionId. The item is physically deleted (since soft delete is
 * not available in schema). Must be a valid cart/option and owned by the buyer.
 * Deny if ID invalid, ownership not present, already deleted, or checked out.
 * Confirms deletion by status (no body).
 *
 * @param props - Request properties
 * @param props.buyer - Authenticated buyer (BuyerPayload)
 * @param props.cartId - UUID of the shopping cart containing the option
 * @param props.itemOptionId - UUID of the cart item option to remove
 * @returns Void
 * @throws {Error} If the option is not found, does not belong to the specified
 *   cart, or the cart is not owned by the buyer or is not active.
 */
export async function deleteaiCommerceBuyerCartsCartIdItemOptionsItemOptionId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  itemOptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, cartId, itemOptionId } = props;

  // 1. Find the item option (must exist)
  const itemOption =
    await MyGlobal.prisma.ai_commerce_cart_item_options.findFirst({
      where: {
        id: itemOptionId,
      },
      select: {
        id: true,
        cart_item_id: true,
      },
    });
  if (!itemOption) {
    throw new Error(
      "Cart item option not found (already deleted or never existed).",
    );
  }

  // 2. Find the parent cart item (must exist)
  const cartItem = await MyGlobal.prisma.ai_commerce_cart_items.findFirst({
    where: {
      id: itemOption.cart_item_id,
    },
    select: {
      id: true,
      cart_id: true,
    },
  });
  if (!cartItem) {
    throw new Error("Parent cart item not found or already deleted.");
  }
  if (cartItem.cart_id !== cartId) {
    throw new Error("Cart item does not belong to specified cart.");
  }

  // 3. Find the cart and enforce ownership/status rules
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
    },
    select: {
      id: true,
      buyer_id: true,
      status: true,
    },
  });
  if (!cart) {
    throw new Error("Cart not found or has already been deleted.");
  }
  if (cart.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: You do not own this cart.");
  }
  if (cart.status !== "active") {
    throw new Error("Cannot update an inactive or checked out cart.");
  }

  // 4. Perform hard delete - since soft delete is not possible
  await MyGlobal.prisma.ai_commerce_cart_item_options.delete({
    where: { id: itemOptionId },
  });
}
