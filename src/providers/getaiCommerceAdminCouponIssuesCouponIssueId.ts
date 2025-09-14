import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full detail for a coupon issue (admin only) from
 * ai_commerce_coupon_issues.
 *
 * Returns a specific coupon issue record (user-assigned coupon) from the
 * 'ai_commerce_coupon_issues' table, found by couponIssueId. Information
 * includes coupon entity reference, user/account, issuance/expiry dates,
 * redemption status, and relevant campaign attribution or batch info.
 *
 * This endpoint is vital for support, compliance, and business investigation
 * scenarios where an individual coupon's journey through issuance and usage
 * must be audited and traced. Only admin users may access per-issue detail, as
 * assignment and redemption pathways are sensitive.
 *
 * Handles not found, permission, and record status errors robustly for
 * operational integration.
 *
 * @param props - Object containing admin authorization and couponIssueId
 * @param props.admin - The authenticated admin making the request
 * @param props.couponIssueId - Unique identifier for the coupon issue record to
 *   retrieve
 * @returns The full coupon issue record with all metadata and tracking fields
 * @throws {Error} If no matching, non-deleted coupon issue is found for the
 *   provided ID.
 */
export async function getaiCommerceAdminCouponIssuesCouponIssueId(props: {
  admin: AdminPayload;
  couponIssueId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCouponIssue> {
  const { couponIssueId } = props;
  const record = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst({
    where: {
      id: couponIssueId,
      deleted_at: null,
    },
  });
  if (!record) throw new Error("Coupon issue not found");
  return {
    id: record.id,
    coupon_id: record.coupon_id,
    issued_to: record.issued_to,
    status: record.status,
    issued_at: toISOStringSafe(record.issued_at),
    expires_at: toISOStringSafe(record.expires_at),
    redeemed_at:
      record.redeemed_at != null
        ? toISOStringSafe(record.redeemed_at)
        : undefined,
    batch_reference: record.batch_reference ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at != null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
