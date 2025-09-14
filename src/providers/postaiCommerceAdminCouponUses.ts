import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Redeem a valid issued coupon by creating an ai_commerce_coupon_uses record.
 *
 * This function records a new coupon redemption event by atomically creating a
 * coupon use record and updating the coupon issue's state to 'redeemed'. It
 * enforces business logic constraints such as eligibility, expiration, and
 * one-time use.
 *
 * Admins may redeem a coupon on behalf of a user, given valid coupon issue and
 * redemption context. All datetime and uuid values use correct branding, and
 * all error edge cases are handled strictly.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin initiating this operation
 * @param props.body - Coupon redemption data, including coupon_issue_id,
 *   user_id, order_id, status, redeemed_at
 * @returns Newly created IAiCommerceCouponUse object representing the
 *   redemption event
 * @throws {Error} If coupon issue does not exist, is not eligible, is expired,
 *   or has already been redeemed
 */
export async function postaiCommerceAdminCouponUses(props: {
  admin: AdminPayload;
  body: IAiCommerceCouponUse.ICreate;
}): Promise<IAiCommerceCouponUse> {
  const { body } = props;
  // Step 1: Validate coupon issue eligibility (right user, correct status)
  const couponIssue = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst(
    {
      where: {
        id: body.coupon_issue_id,
        issued_to: body.user_id,
        status: "issued",
      },
    },
  );
  if (!couponIssue) {
    throw new Error(
      "Coupon issue is not found or not eligible for redemption (may be wrong user, not issued, or already revoked/redeemed).",
    );
  }
  // Step 2: Check that coupon issue has not expired
  if (
    toISOStringSafe(couponIssue.expires_at) < toISOStringSafe(body.redeemed_at)
  ) {
    throw new Error(
      "Coupon has expired (redemption attempted after expiration datetime).",
    );
  }
  // Step 3: Prevent double redemption of this coupon issue
  const existingUse = await MyGlobal.prisma.ai_commerce_coupon_uses.findFirst({
    where: { coupon_issue_id: body.coupon_issue_id },
  });
  if (existingUse) {
    throw new Error("Coupon has already been redeemed.");
  }
  // Step 4: Atomically update issue status and insert usage record
  const couponUseId = v4() as string & tags.Format<"uuid">;
  const redeemedAt = toISOStringSafe(body.redeemed_at);
  const now = toISOStringSafe(new Date());

  const [, createdUse] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ai_commerce_coupon_issues.update({
      where: { id: body.coupon_issue_id },
      data: { status: "redeemed", redeemed_at: redeemedAt },
    }),
    MyGlobal.prisma.ai_commerce_coupon_uses.create({
      data: {
        id: couponUseId,
        coupon_issue_id: body.coupon_issue_id,
        redeemed_by: body.user_id,
        status: body.status,
        redeemed_at: redeemedAt,
        order_id: body.order_id ?? null,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);
  return {
    id: createdUse.id,
    coupon_issue_id: createdUse.coupon_issue_id,
    user_id: createdUse.redeemed_by,
    status: createdUse.status,
    redeemed_at: toISOStringSafe(createdUse.redeemed_at),
    order_id: createdUse.order_id ?? null,
  };
}
