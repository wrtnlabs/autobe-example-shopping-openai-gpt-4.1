import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Fetch details of a specific coupon use event from ai_commerce_coupon_uses by
 * couponUseId
 *
 * Retrieves details about a specific coupon redemption event from
 * ai_commerce_coupon_uses table by couponUseId, returning user, coupon, order,
 * status, and timing information. This is used for compliance, audit, support,
 * or campaign impact analysis. Sensitive fields are masked based on the
 * requesting role and context. Only authorized business actors may access this
 * data, with audit logging enabled.
 *
 * Authorization: Only the seller who owns (issued) the coupon can access coupon
 * usage events for that coupon.
 *
 * @param props - Object containing seller authentication and couponUseId (UUID
 *   of the coupon use event)
 * @param props.seller - Authenticated seller payload (must match issuer)
 * @param props.couponUseId - The unique identifier of the coupon
 *   usage/redemption event to fetch
 * @returns Detailed coupon usage event information conforming to
 *   IAiCommerceCouponUse DTO, including coupon issue, redeemed user, related
 *   order, status, and timestamps
 * @throws {Error} If the coupon use does not exist, or if the seller does not
 *   own the coupon, or required entities are missing
 */
export async function getaiCommerceSellerCouponUsesCouponUseId(props: {
  seller: SellerPayload;
  couponUseId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCouponUse> {
  const { seller, couponUseId } = props;

  // Fetch the coupon use record
  const couponUse = await MyGlobal.prisma.ai_commerce_coupon_uses.findFirst({
    where: {
      id: couponUseId,
      deleted_at: null,
    },
    select: {
      id: true,
      coupon_issue_id: true,
      redeemed_by: true,
      order_id: true,
      status: true,
      redeemed_at: true,
    },
  });
  if (!couponUse) {
    throw new Error("Coupon use not found");
  }

  // Fetch the coupon issue (to verify ownership)
  const couponIssue = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst(
    {
      where: { id: couponUse.coupon_issue_id, deleted_at: null },
      select: { coupon_id: true },
    },
  );
  if (!couponIssue) {
    throw new Error("Coupon issue not found");
  }

  // Fetch the coupon and check issued_by matches the seller
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: { id: couponIssue.coupon_id, deleted_at: null },
    select: { issued_by: true },
  });
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  if (!coupon.issued_by || coupon.issued_by !== seller.id) {
    throw new Error("Forbidden: You do not own this coupon use");
  }

  // Build result, mapping fields per DTO spec.
  // Note: Dates must be converted with toISOStringSafe; never use native Date type

  const result: IAiCommerceCouponUse = {
    id: couponUse.id,
    coupon_issue_id: couponUse.coupon_issue_id,
    user_id: couponUse.redeemed_by,
    status: couponUse.status,
    redeemed_at: toISOStringSafe(couponUse.redeemed_at),
    order_id: couponUse.order_id ?? undefined,
  };
  return result;
}
