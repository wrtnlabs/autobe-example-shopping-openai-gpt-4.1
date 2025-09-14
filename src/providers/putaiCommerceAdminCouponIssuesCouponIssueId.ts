import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an issued coupon's status or expiry by couponIssueId
 * (ai_commerce_coupon_issues table).
 *
 * Allows an authorized administrator to update fields (status, expiry) of a
 * coupon issue. Validates state so only issues in modifiable state (not
 * redeemed, expired, revoked) can be changed. All updates record new updated_at
 * timestamp, and date/datetime values always use branded ISO8601 strings.
 * Attempts to update locked coupon issues are rejected.
 *
 * @param props - Properties for the update operation
 * @param props.admin - The authenticated admin performing the operation
 * @param props.couponIssueId - The unique coupon issue ID to update
 * @param props.body - Update fields such as status (string), expires_at
 *   (date-time|null)
 * @returns The updated coupon issue with all fields as required for the API
 *   contract
 * @throws {Error} When the coupon issue is not found or cannot be updated
 *   because it's redeemed, expired, or locked
 */
export async function putaiCommerceAdminCouponIssuesCouponIssueId(props: {
  admin: AdminPayload;
  couponIssueId: string & tags.Format<"uuid">;
  body: IAiCommerceCouponIssue.IUpdate;
}): Promise<IAiCommerceCouponIssue> {
  const { couponIssueId, body } = props;

  // 1. Look up the coupon issue - must not be soft-deleted
  const found = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst({
    where: {
      id: couponIssueId,
      deleted_at: null,
    },
  });
  if (!found) {
    throw new Error("Coupon issue not found");
  }
  // 2. Enforce only updatable in correct states
  if (
    found.status === "redeemed" ||
    found.status === "expired" ||
    found.status === "revoked"
  ) {
    throw new Error(
      "Coupons that are redeemed, expired, or revoked cannot be modified",
    );
  }
  // 3. Prepare updates, only if provided and not forbidden. Ignore description.
  const update = {
    // status: only update if present
    ...(body.status !== undefined && { status: body.status }),
    // expires_at: allow null/undefined as per DTO and Prisma
    ...(body.expires_at !== undefined && { expires_at: body.expires_at }),
    // always update updated_at
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.ai_commerce_coupon_issues.update({
    where: { id: couponIssueId },
    data: update,
  });
  // 4. Return all fields, branding dates, propagate null/undefined as DTO expects
  return {
    id: updated.id,
    coupon_id: updated.coupon_id,
    issued_to: updated.issued_to,
    status: updated.status,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    redeemed_at: updated.redeemed_at
      ? toISOStringSafe(updated.redeemed_at)
      : updated.redeemed_at,
    batch_reference: updated.batch_reference ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : updated.deleted_at,
  };
}
