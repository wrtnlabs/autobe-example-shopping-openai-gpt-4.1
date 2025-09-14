import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the status or business fields of a payment fraud event audit record.
 *
 * This function allows authorized admins to update only permitted fields
 * (status, description, reviewed_at) of an existing payment fraud event record,
 * enforcing immutability on all other properties. It enforces legal and
 * compliance controls by strictly validating updatable fields and mapping all
 * date/datetime fields to the required string & tags.Format<'date-time'>
 * branding.
 *
 * @param props - Admin: Authenticated admin performing the update
 *   paymentFraudEventId: UUIDv4 identifying the payment fraud event to update
 *   body: Fields to update (one or more of status, description, reviewed_at)
 * @returns The updated fraud event record (IAiCommercePaymentFraudEvent), all
 *   date fields as branded ISO strings
 * @throws Error If forbidden properties are included in the update or target
 *   record does not exist
 */
export async function putaiCommerceAdminPaymentFraudEventsPaymentFraudEventId(props: {
  admin: AdminPayload;
  paymentFraudEventId: string & tags.Format<"uuid">;
  body: IAiCommercePaymentFraudEvent.IUpdate;
}): Promise<IAiCommercePaymentFraudEvent> {
  const { paymentFraudEventId, body } = props;
  // List of fields that are always immutable
  const forbiddenFields = [
    "event_code",
    "entity_type",
    "entity_id",
    "detected_at",
    "created_at",
    "id",
  ];
  // Validate body contains only allowed fields
  for (const key of Object.keys(body)) {
    if (forbiddenFields.includes(key)) {
      throw new Error(
        `Update not permitted: Cannot modify immutable field '${key}'. Only status, description, and reviewed_at may be changed.`,
      );
    }
  }
  // Retrieve record (throws if not found)
  const fraudEvent =
    await MyGlobal.prisma.ai_commerce_payment_fraud_events.findUnique({
      where: { id: paymentFraudEventId },
    });
  if (!fraudEvent) {
    throw new Error(
      "Fraud event with specified paymentFraudEventId does not exist",
    );
  }

  // Compose updateData only including present values. Always update updated_at.
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    updateData.status = body.status ?? undefined;
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    // If the request includes description, accept string or explicit null (to clear)
    updateData.description =
      body.description === null ? null : (body.description ?? undefined);
  }
  if (Object.prototype.hasOwnProperty.call(body, "reviewed_at")) {
    // reviewed_at can be set to explicit null (to clear)
    updateData.reviewed_at =
      body.reviewed_at === null ? null : (body.reviewed_at ?? undefined);
  }

  // Update in database
  const updated = await MyGlobal.prisma.ai_commerce_payment_fraud_events.update(
    {
      where: { id: paymentFraudEventId },
      data: updateData,
    },
  );

  // Format response according to IAiCommercePaymentFraudEvent: all date fields as strings, optional/nullable handled properly
  return {
    id: updated.id,
    event_code: updated.event_code,
    entity_type: updated.entity_type,
    entity_id: updated.entity_id,
    status: updated.status,
    // Optional string|undefined result per interface (if property does not exist)
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    detected_at: toISOStringSafe(updated.detected_at),
    reviewed_at:
      typeof updated.reviewed_at === "undefined" || updated.reviewed_at === null
        ? undefined
        : toISOStringSafe(updated.reviewed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
