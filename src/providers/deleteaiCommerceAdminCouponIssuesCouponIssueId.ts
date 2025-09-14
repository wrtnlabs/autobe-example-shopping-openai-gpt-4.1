import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes an unredeemed, unexpired coupon issue by couponIssueId.
 *
 * This operation enforces physical deletion from the ai_commerce_coupon_issues
 * table. It only allows deletion if the coupon issue is currently unused (not
 * redeemed) and has not yet expired. Attempts to delete a coupon issue that has
 * either been used/redeemed or is past expiry are denied and result in an
 * error.
 *
 * Only privileged admin roles are permitted to invoke this endpoint. Audit
 * trail entries and compliance records should be handled elsewhere as needed.
 * No default values or type assertions are used; all types are branded and Date
 * objects are never exposed.
 *
 * @param props - The object of input arguments
 * @param props.admin - The authenticated administrator payload
 * @param props.couponIssueId - The unique UUID of the coupon issue to delete
 * @returns Void
 * @throws {Error} Coupon issue not found or already deleted
 * @throws {Error} Coupon issue has already been redeemed
 * @throws {Error} Coupon issue is already expired
 */
export async function deleteaiCommerceAdminCouponIssuesCouponIssueId(props: {
  admin: AdminPayload;
  couponIssueId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { couponIssueId } = props;
  // Find the coupon issue (must not be already deleted)
  const couponIssue = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst(
    {
      where: { id: couponIssueId, deleted_at: null },
    },
  );
  if (!couponIssue) {
    throw new Error("Coupon issue not found or already deleted");
  }
  // If redeemed_at is populated, cannot delete (used already)
  if (
    couponIssue.redeemed_at !== null &&
    couponIssue.redeemed_at !== undefined
  ) {
    throw new Error("Coupon issue has already been redeemed");
  }
  // Must not be expired (expires_at must be after now)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (couponIssue.expires_at <= now) {
    throw new Error("Coupon issue is already expired");
  }
  // Proceed with physical delete
  await MyGlobal.prisma.ai_commerce_coupon_issues.delete({
    where: { id: couponIssueId },
  });
  // No return value
}
