import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a coupon use/redemption in ai_commerce_coupon_uses by couponUseId, for
 * admin/seller corrections
 *
 * Authorized sellers may update their own issued coupon usage record by
 * couponUseId, allowing status, event correction, or order linkage, only before
 * settlement or audit. All updates are denied if the usage is finalized,
 * expired, or audited. Sellers are authorized only if they issued the coupon.
 * The function grants explicit mutation to status, order_id, and redeemed_at
 * fields, and guarantees full DTO compliance, strict date handling, and
 * immutability. All changes are compliance-traceable (audit logging omitted for
 * brevity).
 *
 * @param props - Operation arguments
 * @param props.seller - Authenticated seller performing the operation (must
 *   match coupon issuer)
 * @param props.couponUseId - Target coupon use row id (UUID-formatted)
 * @param props.body - DTO with fields to update (status/order_id/redeemed_at),
 *   mapped strictly per spec
 * @returns The updated coupon use entity mapped as IAiCommerceCouponUse
 * @throws {Error} When not found, not authorized, or entity is not updatable
 */
export async function putaiCommerceSellerCouponUsesCouponUseId(props: {
  seller: SellerPayload;
  couponUseId: string & tags.Format<"uuid">;
  body: IAiCommerceCouponUse.IUpdate;
}): Promise<IAiCommerceCouponUse> {
  const { seller, couponUseId, body } = props;
  // 1. Fetch coupon use entity
  const couponUse = await MyGlobal.prisma.ai_commerce_coupon_uses.findUnique({
    where: { id: couponUseId },
  });
  if (!couponUse) throw new Error("Coupon use not found");
  // 2. Fetch related coupon issue with coupon
  const couponIssue =
    await MyGlobal.prisma.ai_commerce_coupon_issues.findUnique({
      where: { id: couponUse.coupon_issue_id },
      include: { coupon: true },
    });
  if (!couponIssue || !couponIssue.coupon)
    throw new Error("Coupon issue/coupon not found");
  // 3. Auth check: only seller who issued the coupon can update
  if (couponIssue.coupon.issued_by !== seller.id)
    throw new Error(
      "Unauthorized: Seller may only update their issued coupons",
    );
  // 4. Prevent updates to closed/finalized/audited records
  const blocked = ["finalized", "expired", "audited"];
  if (blocked.includes(couponUse.status))
    throw new Error("Cannot update finalized/expired/audited coupon use");
  // 5. Prepare fields for update
  const now = toISOStringSafe(new Date());
  const data: Record<string, unknown> = { updated_at: now };
  if (Object.prototype.hasOwnProperty.call(body, "status"))
    data.status = body.status;
  if (Object.prototype.hasOwnProperty.call(body, "order_id"))
    data.order_id = body.order_id ?? null;
  if (Object.prototype.hasOwnProperty.call(body, "redeemed_at"))
    data.redeemed_at = body.redeemed_at ?? null;
  // 6. Run DB update
  const updated = await MyGlobal.prisma.ai_commerce_coupon_uses.update({
    where: { id: couponUseId },
    data,
  });
  // 7. Map to DTO & enforce strict type mapping (no Date, all strings + tags)
  return {
    id: updated.id,
    coupon_issue_id: updated.coupon_issue_id,
    user_id: updated.redeemed_by,
    status: updated.status,
    redeemed_at: updated.redeemed_at ?? null,
    order_id: updated.order_id ?? null,
  };
}
