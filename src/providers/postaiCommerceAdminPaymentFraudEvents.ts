import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Insert a new payment fraud audit event entry into
 * ai_commerce_payment_fraud_events.
 *
 * Allows compliance or security teams to log a new fraud event into the
 * platform audit trail, either due to externally detected fraud, review team
 * identification, or API-driven risk triggers. Accepted data includes the fraud
 * event code, entity type/ID, status, detailed description, and detection
 * timestamp. All required validations, business process triggers, and
 * timestamping must be strictly enforced.
 *
 * This is a privileged administrative operation. Public or regular user-facing
 * flows must never create fraud audit events. Entries are immutable once
 * created and form the source of truth for audit, compliance, and
 * compensation/recovery actions.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.body - Fraud event details for creation, including event code,
 *   entity type, IDs, description, status, and detection time
 * @returns The created payment fraud event audit entry as written to the audit
 *   log
 * @throws {Error} When a duplicate fraud event exists with the same identifying
 *   fields
 * @throws {Error} If authentication/authorization fails (enforced by decorator)
 */
export async function postaiCommerceAdminPaymentFraudEvents(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentFraudEvent.ICreate;
}): Promise<IAiCommercePaymentFraudEvent> {
  const { admin, body } = props;
  // Duplicate check: event_code, entity_type, entity_id, status, detected_at must be unique (soft-deleted ignored)
  const existing =
    await MyGlobal.prisma.ai_commerce_payment_fraud_events.findFirst({
      where: {
        event_code: body.event_code,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        status: body.status,
        detected_at: body.detected_at,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new Error(
      "Duplicate fraud event exists with these identifying fields",
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_payment_fraud_events.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_code: body.event_code,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        status: body.status,
        description: body.description ?? undefined,
        detected_at: body.detected_at,
        created_at: now,
        updated_at: now,
        // reviewed_at and deleted_at omitted by default (nullable/optional)
      },
    },
  );
  return {
    id: created.id,
    event_code: created.event_code,
    entity_type: created.entity_type,
    entity_id: created.entity_id,
    status: created.status,
    description: created.description ?? undefined,
    detected_at: toISOStringSafe(created.detected_at),
    reviewed_at:
      created.reviewed_at == null
        ? undefined
        : toISOStringSafe(created.reviewed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at == null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
