import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove (soft delete) a cart item from a shopping cart
 * (ai_commerce_cart_items).
 *
 * This operation allows an authenticated buyer to remove (soft delete) a
 * specific item from their shopping cart. The item is marked as deleted
 * (deleted_at set) and the parent cart's total_quantity is re-calculated
 * (summed from all non-deleted items).
 *
 * Only the owner of the cart (buyer) may remove items; the operation is
 * forbidden for others. Removal is only permitted if the cart is active and
 * neither the cart nor the item is deleted.
 *
 * @param props - Parameters including buyer auth payload, cartId (shopping cart
 *   UUID), and cartItemId (cart item UUID)
 * @param props.buyer - Authenticated buyer making the request (BuyerPayload)
 * @param props.cartId - Unique ID of the cart
 * @param props.cartItemId - Unique ID of the cart item to be deleted
 * @returns Void
 * @throws {Error} If the cart or item does not exist, is not owned by the
 *   buyer, or already deleted
 * @throws {Error} If the cart is not in active status (e.g., checked out)
 */
export async function deleteaiCommerceBuyerCartsCartIdItemsCartItemId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, cartId, cartItemId } = props;
  // Step 1: Fetch the cart item, ensure it exists and is not deleted
  const cartItem = await MyGlobal.prisma.ai_commerce_cart_items.findFirst({
    where: { id: cartItemId, cart_id: cartId, deleted_at: null },
    select: { id: true, cart_id: true, deleted_at: true, quantity: true },
  });
  if (!cartItem) throw new Error("Cart item not found or already deleted");

  // Step 2: Fetch the parent cart and verify ownership/active status
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: { id: cartId, deleted_at: null },
    select: { id: true, buyer_id: true, status: true },
  });
  if (!cart) throw new Error("Cart not found or deleted");
  if (cart.buyer_id !== buyer.id)
    throw new Error("Forbidden: Only the cart owner can delete cart items");
  if (cart.status !== "active")
    throw new Error("Cannot delete items from inactive or checked-out carts");

  // Step 3: Soft-delete the cart item (set deleted_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_cart_items.update({
    where: { id: cartItemId },
    data: { deleted_at: now },
  });

  // Step 4: Recompute parent cart's total_quantity from non-deleted items
  const remainingItems = await MyGlobal.prisma.ai_commerce_cart_items.findMany({
    where: { cart_id: cartId, deleted_at: null },
    select: { quantity: true },
  });
  const totalQuantity = remainingItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  await MyGlobal.prisma.ai_commerce_carts.update({
    where: { id: cartId },
    data: { total_quantity: totalQuantity },
  });
}
