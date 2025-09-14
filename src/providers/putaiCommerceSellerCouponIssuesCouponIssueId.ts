import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates the status or expiry of a coupon issue identified by couponIssueId.
 *
 * This operation allows the issuing seller to update a coupon issue
 * (ai_commerce_coupon_issues) if the coupon has not been redeemed, expired, or
 * revoked. Allowed fields for update are status and expires_at, per business
 * logic and available model fields. Update is permitted only if the seller is
 * the issuer and the coupon issue is in 'issued' state. All updates refresh
 * updated_at timestamp.
 *
 * @param props - Operation properties
 * @param props.seller - Authenticated seller payload (ownership must match
 *   coupon issuer)
 * @param props.couponIssueId - Coupon issue UUID to update
 * @param props.body - Fields to update (status, expires_at)
 * @returns Updated IAiCommerceCouponIssue DTO for the coupon issue
 * @throws {Error} When the coupon issue is not found, not owned by seller, or
 *   not updatable
 */
export async function putaiCommerceSellerCouponIssuesCouponIssueId(props: {
  seller: SellerPayload;
  couponIssueId: string & tags.Format<"uuid">;
  body: IAiCommerceCouponIssue.IUpdate;
}): Promise<IAiCommerceCouponIssue> {
  const { seller, couponIssueId, body } = props;

  // Step 1: Fetch coupon issue (WITHOUT include)
  const couponIssue = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst(
    {
      where: { id: couponIssueId },
    },
  );
  if (!couponIssue) throw new Error("쿠폰 이슈를 찾을 수 없습니다.");

  // Step 2: Fetch the related coupon to check ownership
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findUnique({
    where: { id: couponIssue.coupon_id },
  });
  if (!coupon) throw new Error("쿠폰 정보를 찾을 수 없습니다.");
  if (coupon.issued_by === null || coupon.issued_by !== seller.id)
    throw new Error(
      "권한이 없습니다: 해당 쿠폰을 발급한 셀러만 수정할 수 있습니다.",
    );

  // Step 3: Only allow update in 'issued' state
  if (couponIssue.status !== "issued")
    throw new Error("발급 상태('issued')에서만 수정이 허용됩니다.");

  // Step 4: Prepare update fields (only set if present)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_coupon_issues.update({
    where: { id: couponIssueId },
    data: {
      status: body.status !== undefined ? body.status : undefined,
      expires_at:
        body.expires_at !== undefined
          ? (body.expires_at ?? undefined)
          : undefined,
      updated_at: now,
    },
  });

  // Step 5: Refetch and return updated record to ensure freshness for all computed fields
  const updated =
    await MyGlobal.prisma.ai_commerce_coupon_issues.findFirstOrThrow({
      where: { id: couponIssueId },
    });

  return {
    id: updated.id,
    coupon_id: updated.coupon_id,
    issued_to: updated.issued_to,
    status: updated.status,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    redeemed_at:
      updated.redeemed_at !== null && updated.redeemed_at !== undefined
        ? toISOStringSafe(updated.redeemed_at)
        : undefined,
    batch_reference: updated.batch_reference ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
