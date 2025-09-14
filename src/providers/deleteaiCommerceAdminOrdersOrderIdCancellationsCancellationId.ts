import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a specific refund for an order from the
 * ai_commerce_order_refunds table.
 *
 * This API permanently removes a refund entity from the order, subject to the
 * business rule that finalized refunds (approved, denied, completed, paid)
 * cannot be erased. All removals are hard deletes, and an audit log is written
 * to ai_commerce_order_audit_logs for compliance and traceability.
 *
 * Only administrators may perform this action. The operation is typically
 * performed after internal review, compliance evidence requirements, or
 * correction of erroneous records.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated administrator payload
 * @param props.orderId - UUID of the parent order
 * @param props.cancellationId - UUID of the refund ("cancellation") to delete
 * @returns Void
 * @throws {Error} If the refund is not found for the order
 * @throws {Error} If the refund is in a finalized state and cannot be deleted
 */
export async function deleteaiCommerceAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, cancellationId } = props;

  // Fetch refund record, ensure it belongs to the correct order
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findFirst({
    where: {
      id: cancellationId,
      order_id: orderId,
    },
  });
  if (!refund) {
    throw new Error("Refund not found");
  }
  // Prevent deletion of finalized/paid refunds
  const finalizedStatuses = ["approved", "denied", "completed", "paid"];
  if (finalizedStatuses.includes(refund.status)) {
    throw new Error("Cannot delete finalized refund");
  }

  // Hard delete the refund
  await MyGlobal.prisma.ai_commerce_order_refunds.delete({
    where: { id: cancellationId },
  });

  // Write audit log
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      event_type: "REFUND_DELETE",
      actor_id: admin.id,
      event_note:
        refund.refund_code !== undefined && refund.refund_code !== null
          ? `Refund ${refund.refund_code} deleted`
          : `Refund ${refund.id} deleted`,
      occurred_at: toISOStringSafe(new Date()),
    },
  });
}
