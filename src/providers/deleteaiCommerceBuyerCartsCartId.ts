import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Soft-delete (logical removal) of a shopping cart (ai_commerce_carts) by ID,
 * preserving for audit/compliance.
 *
 * This operation marks a shopping cart as deleted (ai_commerce_carts) by
 * setting the `deleted_at` timestamp. It ensures only the cart's owner (buyer)
 * may perform the soft-delete; no physical removal occurs. Preserves the cart
 * row for possible recovery and legal compliance.
 *
 * All date/datetime values are string & tags.Format<'date-time'>. No native
 * Date type is used in the API boundary.
 *
 * @param props - Operation parameters
 * @param props.buyer - Authenticated buyer (cart owner)
 * @param props.cartId - UUID of the cart to delete
 * @returns Void (no output on success)
 * @throws {Error} If cart not found, already deleted, or buyer not authorized
 */
export async function deleteaiCommerceBuyerCartsCartId(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, cartId } = props;

  // Fetch cart by ID
  const cart = await MyGlobal.prisma.ai_commerce_carts.findUnique({
    where: { id: cartId },
  });
  if (!cart) {
    throw new Error("Cart not found");
  }
  if (cart.deleted_at !== null) {
    throw new Error("Cart has already been deleted");
  }
  if (!cart.buyer_id || cart.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: Only the cart owner may delete this cart");
  }

  // Soft-delete by setting deleted_at (as ISO string)
  await MyGlobal.prisma.ai_commerce_carts.update({
    where: { id: cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
