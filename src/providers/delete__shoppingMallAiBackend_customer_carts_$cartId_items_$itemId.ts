import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft deletes a specific item from a user's cart using cartId and itemId.
 *
 * Delete a cart item from the user's cart. This endpoint performs a soft
 * deletion of the item (setting deleted_at timestamp) to maintain evidence and
 * enable compliance with business and legal data retention policies. Only the
 * cart owner or session-linked guest has permission to delete items. The
 * endpoint will fail with a clear error if attempting to delete an item that is
 * locked or referenced by an in-progress order. Evidence and audit detail are
 * also preserved for rollback and review.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the deletion
 * @param props.cartId - Target cart's unique identifier (UUID)
 * @param props.itemId - Target cart item's identifier (UUID)
 * @returns Void (successful soft-delete returns no content)
 * @throws {Error} When the cart does not exist, is deleted, is not owned by the
 *   customer, or the item does not exist or is already deleted
 */
export async function delete__shoppingMallAiBackend_customer_carts_$cartId_items_$itemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, cartId, itemId } = props;

  // Step 1: Fetch cart item and validate active/non-deleted
  const item =
    await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_cart_id: cartId,
        deleted_at: null,
      },
    });
  if (!item) {
    throw new Error("Cart item not found or already deleted");
  }

  // Step 2: Fetch cart and check that it's active and owned by the authenticated customer
  const cart = await MyGlobal.prisma.shopping_mall_ai_backend_carts.findFirst({
    where: {
      id: cartId,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new Error("Cart not found or already deleted");
  }
  if (
    !cart.shopping_mall_ai_backend_customer_id ||
    cart.shopping_mall_ai_backend_customer_id !== customer.id
  ) {
    throw new Error("Forbidden: You do not own this cart");
  }

  // Step 3: Soft-delete the item by setting its deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_ai_backend_cart_items.update({
    where: { id: itemId },
    data: { deleted_at: deletedAt },
  });
}
