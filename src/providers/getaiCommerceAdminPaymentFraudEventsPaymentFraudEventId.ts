import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a payment fraud event log record by its unique ID from
 * ai_commerce_payment_fraud_events.
 *
 * Returns a single payment fraud event record from the
 * ai_commerce_payment_fraud_events audit table, identified by
 * paymentFraudEventId. Used by back-office or admin users for deep dive
 * analysis, incident investigation, or compliance export requirements. The
 * ai_commerce_payment_fraud_events entity is immutable (never manually edited
 * or deleted), and stores complete details of rule-based/manual/AI-detected
 * fraud, including event codes, entity type, description, timestamps, and
 * resolution state. This endpoint facilitates high-trust workflows, such as
 * regulatory filings, business analytics, or legal evidence extraction.
 *
 * Strict role-based access control must be applied (admin only—enforced by
 * authentication layer).
 *
 * @param props - Object containing authentication and the paymentFraudEventId
 *   path parameter
 * @param props.admin - The authenticated admin making the request (role-based
 *   authorization)
 * @param props.paymentFraudEventId - The unique identifier for the desired
 *   payment fraud event
 * @returns The full IAiCommercePaymentFraudEvent record for the requested
 *   paymentFraudEventId
 * @throws {Error} If no matching payment fraud event exists or has been deleted
 *   (soft delete)
 */
export async function getaiCommerceAdminPaymentFraudEventsPaymentFraudEventId(props: {
  admin: AdminPayload;
  paymentFraudEventId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePaymentFraudEvent> {
  const { paymentFraudEventId } = props;
  const row =
    await MyGlobal.prisma.ai_commerce_payment_fraud_events.findFirstOrThrow({
      where: {
        id: paymentFraudEventId,
        deleted_at: null,
      },
    });
  return {
    id: row.id,
    event_code: row.event_code,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    status: row.status,
    description: row.description === null ? undefined : row.description,
    detected_at: toISOStringSafe(row.detected_at),
    reviewed_at:
      row.reviewed_at === null ? undefined : toISOStringSafe(row.reviewed_at),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
  };
}
