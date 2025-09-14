import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a specified sub-order from a parent order (admin-only).
 *
 * This endpoint allows a platform administrator to permanently remove a
 * sub-order (ai_commerce_sub_orders) belonging to a specific parent order
 * (ai_commerce_orders) if and only if the sub-order meets all business criteria
 * for deletion. Deletion is strictly prohibited if the sub-order has any
 * fulfillment actions or if payment has already been completed for the parent
 * order. The deletion is a hard delete (removes the record), and an audit entry
 * is logged in ai_commerce_order_audit_logs for traceability.
 *
 * @param props - Input containing the authenticated admin and the target order
 *   and sub-order IDs
 * @param props.admin - The authenticated admin user (AdminPayload)
 * @param props.orderId - The parent order ID (UUID, must match the sub-order)
 * @param props.subOrderId - The sub-order ID to delete (UUID)
 * @returns Void
 * @throws {Error} If the sub-order does not exist for the specified order, is
 *   not in a deletable state, has fulfillment records, or payment on order is
 *   completed
 */
export async function deleteaiCommerceAdminOrdersOrderIdSubOrdersSubOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, subOrderId } = props;

  // 1. Fetch sub-order, ensure it belongs to the correct order
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findUnique({
    where: {
      id: subOrderId,
    },
  });
  if (!subOrder || subOrder.order_id !== orderId) {
    throw new Error("Sub-order not found for the specified parent order.");
  }
  // 2. Allow only certain statuses to be deleted (expandable per business rules)
  const deletableStates = ["created"];
  if (!deletableStates.includes(subOrder.status)) {
    throw new Error(`Sub-order status '${subOrder.status}' is not deletable.`);
  }
  // 3. Refuse deletion if any fulfillment started for this sub-order
  const fulfillment =
    await MyGlobal.prisma.ai_commerce_order_fulfillments.findFirst({
      where: {
        suborder_id: subOrderId,
      },
    });
  if (fulfillment) {
    throw new Error(
      "Cannot delete sub-order: order fulfillment process has started.",
    );
  }
  // 4. Refuse deletion if any payment is completed for the parent order
  const payment = await MyGlobal.prisma.ai_commerce_order_payments.findFirst({
    where: {
      order_id: orderId,
      status: "completed",
    },
  });
  if (payment) {
    throw new Error(
      "Cannot delete sub-order: payment has been completed for the parent order.",
    );
  }
  // 5. Perform hard delete on the sub-order
  await MyGlobal.prisma.ai_commerce_sub_orders.delete({
    where: { id: subOrderId },
  });
  // 6. Write order audit log entry for compliance/evidence
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      event_type: "suborder_deleted",
      actor_id: admin.id,
      event_note: `Sub-order ${subOrderId} permanently deleted by admin ${admin.id}`,
      occurred_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
