import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an existing payment gateway configuration from
 * ai_commerce_payment_gateways (admin only).
 *
 * This operation allows a system administrator (admin) to permanently mark a
 * payment gateway configuration as deleted. It verifies the existence of the
 * payment gateway, ensures no active payment transactions reference the
 * gateway, and records a comprehensive audit log for compliance. The deletion
 * is implemented as a soft-delete by setting the 'deleted_at' field to the
 * current timestamp.
 *
 * Only administrators have permission to invoke this operation. The process:
 *
 * 1. Fetches the payment gateway by its UUID, ensuring it exists and is not
 *    already deleted.
 * 2. Checks for any in-flight payment transactions (not soft-deleted) that
 *    reference this gateway. If any exist, aborts.
 * 3. Marks the payment gateway as deleted, updating its 'deleted_at' field to the
 *    current time.
 * 4. Inserts an audit log entry recording the admin actor, the operation details,
 *    and an immutable snapshot of the state before deletion.
 * 5. Returns void on success. All errors are provided as Error instances with
 *    clear diagnostics.
 *
 * @param props - The input object containing admin (authorization payload) and
 *   the payment gateway UUID.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.paymentGatewayId - Unique identifier of the payment gateway to
 *   delete.
 * @returns Void
 * @throws {Error} Payment gateway not found (if nonexistent or already
 *   deleted).
 * @throws {Error} Cannot delete payment gateway: active transactions exist (if
 *   referentially in use).
 */
export async function deleteaiCommerceAdminPaymentGatewaysPaymentGatewayId(props: {
  admin: AdminPayload;
  paymentGatewayId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, paymentGatewayId } = props;

  // Fetch gateway; ensure it exists and is not already deleted
  const gateway = await MyGlobal.prisma.ai_commerce_payment_gateways.findFirst({
    where: {
      id: paymentGatewayId,
      deleted_at: null,
    },
  });
  if (!gateway) {
    throw new Error("Payment gateway not found");
  }

  // Check for referencing active payment transactions
  const referencingTransaction =
    await MyGlobal.prisma.ai_commerce_payment_transactions.findFirst({
      where: {
        gateway_id: paymentGatewayId,
        deleted_at: null,
      },
    });
  if (referencingTransaction) {
    throw new Error("Cannot delete payment gateway: active transactions exist");
  }

  // Timestamp for deletion and audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Soft-delete the payment gateway (set deleted_at)
  await MyGlobal.prisma.ai_commerce_payment_gateways.update({
    where: { id: paymentGatewayId },
    data: { deleted_at: now },
  });

  // Create audit log entry
  await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "DELETE_PAYMENT_GATEWAY",
      actor_id: admin.id,
      target_table: "ai_commerce_payment_gateways",
      target_id: paymentGatewayId,
      before: JSON.stringify(gateway),
      after: null,
      created_at: now,
    },
  });

  return;
}
