import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete an order item from an order (ai_commerce_order_items) —
 * admin only, hard delete.
 *
 * This operation permanently deletes a specific order item from its parent
 * order, enforcing strict business rules:
 *
 * - Only admins can perform this operation.
 * - The order item must not already be delivered or shipped.
 * - No active after-sales records are allowed for this item.
 * - The parent order must not be closed or delivered.
 *
 * If all validations pass, the order item is hard-deleted, and an audit log
 * entry is created. All date values are handled as string &
 * tags.Format<'date-time'>, and UUIDs are generated using v4().
 *
 * @param props - Object containing admin authentication and order/item IDs.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.orderId - Unique identifier of the parent order.
 * @param props.itemId - Unique identifier of the order item to delete.
 * @returns Void
 * @throws {Error} If the order item, parent order, or business conditions
 *   disallow deletion.
 */
export async function deleteaiCommerceAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, itemId } = props;

  // Step 1: Find the order item (must match order and exist)
  const item = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: itemId,
      order_id: orderId,
    },
  });
  if (!item) throw new Error("Order item not found");

  // Step 2: Check delivery status (block if delivered or shipped)
  if (
    item.delivery_status === "delivered" ||
    item.delivery_status === "shipped"
  ) {
    throw new Error("Cannot delete delivered or shipped order items");
  }

  // Step 3: Check for active after-sales on this item
  const activeAfterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst({
      where: {
        order_item_id: itemId,
        closed_at: null,
      },
    });
  if (activeAfterSales) {
    throw new Error("Cannot delete order item with active after-sales process");
  }

  // Step 4: Check parent order status (block if closed/delivered)
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("Parent order not found");
  if (order.status === "delivered" || order.status === "closed") {
    throw new Error("Cannot delete from closed or delivered order");
  }

  // Step 5: Hard delete the order item
  await MyGlobal.prisma.ai_commerce_order_items.delete({
    where: { id: itemId },
  });

  // Step 6: Audit log entry
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      event_type: "delete_item",
      actor_id: admin.id,
      event_note: `Order item ${itemId} deleted by admin ${admin.id}`,
      occurred_at: toISOStringSafe(new Date()),
    },
  });

  return;
}
