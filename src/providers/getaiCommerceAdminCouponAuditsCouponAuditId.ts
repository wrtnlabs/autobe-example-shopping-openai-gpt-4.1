import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponAudit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a specific coupon audit log entry by ID from ai_commerce_coupon_audits.
 *
 * Fetch detailed information for a single coupon audit entry by its unique ID
 * (couponAuditId). This operation is used for deep compliance reviews, dispute
 * investigations, or export of single evidence records. The
 * ai_commerce_coupon_audits table is immutable and append-only, containing full
 * details of coupon-related lifecycle/business events, such as issuance,
 * redemption, expiration, or administrative actions.
 *
 * Only admins or compliance staff should have access to this API.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the query
 *   (authorization context)
 * @param props.couponAuditId - The unique identifier of the coupon audit log
 *   entry to retrieve
 * @returns The full details of the requested coupon audit log entry by ID
 * @throws {Error} When no audit log entry matching the couponAuditId exists
 */
export async function getaiCommerceAdminCouponAuditsCouponAuditId(props: {
  admin: AdminPayload;
  couponAuditId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCouponAudit> {
  const { couponAuditId } = props;
  const audit = await MyGlobal.prisma.ai_commerce_coupon_audits.findFirst({
    where: { id: couponAuditId },
    select: {
      id: true,
      coupon_id: true,
      event_type: true,
      event_reference: true,
      note: true,
      event_timestamp: true,
    },
  });
  if (!audit) {
    throw new Error("Coupon audit log not found");
  }
  return {
    id: audit.id,
    coupon_id: audit.coupon_id,
    event_type: audit.event_type,
    event_reference:
      audit.event_reference === null ? undefined : audit.event_reference,
    note: audit.note === null ? undefined : audit.note,
    event_timestamp: toISOStringSafe(audit.event_timestamp),
  };
}
