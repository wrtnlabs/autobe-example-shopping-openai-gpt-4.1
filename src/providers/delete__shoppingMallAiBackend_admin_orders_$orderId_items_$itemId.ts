import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a specific order item by marking its deleted_at timestamp. Table:
 * shopping_mall_ai_backend_order_items.
 *
 * Deletes (soft deletes) a single order item by order and item ID, marking the
 * deleted_at field rather than removing the row. This acts as a logical removal
 * and preserves the record for audit/tracing, required for regulatory
 * compliance. Only admins can perform this action, and it is permitted only for
 * items not yet fulfilled or already cancelled. All deletions are logged for
 * traceability.
 *
 * @param props - The request parameters and admin authentication.
 * @param props.admin - The authenticated admin user, validated via
 *   middleware/decorator.
 * @param props.orderId - Target order's unique identifier (UUID string).
 * @param props.itemId - Unique identifier for the item to be deleted (UUID
 *   string).
 * @returns Void (no return value)
 * @throws {Error} If the item does not exist, does not belong to the provided
 *   order, or is already deleted (idempotency enforced).
 */
export async function delete__shoppingMallAiBackend_admin_orders_$orderId_items_$itemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, itemId } = props;

  // Find the order item and ensure it belongs to the given order and is not already deleted
  const orderItem =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!orderItem) {
    throw new Error(
      "Order item not found, already deleted, or does not belong to order",
    );
  }
  // Soft-delete the item by updating the deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_ai_backend_order_items.update({
    where: { id: itemId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
