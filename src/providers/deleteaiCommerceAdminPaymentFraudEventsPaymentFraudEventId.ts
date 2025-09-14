import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a payment fraud event audit record by its ID from
 * ai_commerce_payment_fraud_events.
 *
 * This operation irreversibly deletes a payment fraud event entry from the
 * database, bypassing the soft-delete (deleted_at) field. Reserved strictly for
 * high-privilege compliance officers or senior admins addressing evidentiary
 * invalidation or privacy mandates.
 *
 * Under normal circumstances, audit logs should never be physically deleted due
 * to their significance for business, legal, and forensic review. This endpoint
 * is to be used in exceptional cases only and should ideally be coupled with
 * centralized logging of the action for compliance traceability (no such audit
 * log table exists in schema).
 *
 * Authorization for this operation is enforced at the controller level--only
 * authenticated admins may invoke this method.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin identity (privilege enforced by
 *   controller)
 * @param props.paymentFraudEventId - Unique identifier of the payment fraud
 *   event for hard deletion
 * @returns Void
 * @throws {Error} If the record is not found (404 mapped)
 */
export async function deleteaiCommerceAdminPaymentFraudEventsPaymentFraudEventId(props: {
  admin: AdminPayload;
  paymentFraudEventId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Hard delete from the table by unique identifier
  await MyGlobal.prisma.ai_commerce_payment_fraud_events.delete({
    where: { id: props.paymentFraudEventId },
  });
  // TODO: For full compliance, action logging should be performed here if a cross-module or system-level audit log table exists.
}
