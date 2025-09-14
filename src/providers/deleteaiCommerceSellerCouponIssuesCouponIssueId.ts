import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently deletes an unredeemed, unexpired coupon issue from
 * ai_commerce_coupon_issues.
 *
 * This operation allows an authorized seller to irreversibly remove a coupon
 * issue entry, provided that the coupon issue has not been redeemed and is not
 * expired. Deletion is not allowed for coupon issues that have been redeemed,
 * used, or are expired. Only the seller who issued the coupon may remove coupon
 * issues linked to their coupons. This enforces compliance with privacy and
 * audit requirements for historical control.
 *
 * @param props - Operation arguments
 * @param props.seller - Authenticated seller JWT payload
 * @param props.couponIssueId - ID of the coupon issue to delete
 * @returns Void
 * @throws {Error} When the coupon issue does not exist
 * @throws {Error} When the seller is not authorized for the coupon
 * @throws {Error} If the coupon issue has been redeemed or expired
 */
export async function deleteaiCommerceSellerCouponIssuesCouponIssueId(props: {
  seller: SellerPayload;
  couponIssueId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, couponIssueId } = props;
  // Step 1: Fetch coupon issue (not soft deleted)
  const couponIssue = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst(
    {
      where: {
        id: couponIssueId,
        deleted_at: null,
      },
    },
  );
  if (!couponIssue) {
    throw new Error("Coupon issue not found or already deleted.");
  }
  // Step 2: Authorization check – fetch coupon and verify the seller is issuer
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: {
      id: couponIssue.coupon_id,
      deleted_at: null,
    },
  });
  if (!coupon || coupon.issued_by !== seller.id) {
    throw new Error("Not authorized to delete this coupon issue.");
  }
  // Step 3: Validate unredeemed and unexpired
  // ISO date string comparison is safe (UTC lexicographical order)
  const now = toISOStringSafe(new Date());
  const isRedeemed =
    couponIssue.status === "redeemed" || couponIssue.redeemed_at !== null;
  const isExpired = couponIssue.expires_at <= now;
  if (isRedeemed || isExpired) {
    throw new Error("Cannot delete coupon issue: already redeemed or expired.");
  }
  // Step 4: Hard delete (permanent)
  await MyGlobal.prisma.ai_commerce_coupon_issues.delete({
    where: { id: couponIssueId },
  });
}
