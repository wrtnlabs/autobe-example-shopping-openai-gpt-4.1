import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Redeem a valid issued coupon by creating an ai_commerce_coupon_uses record.
 *
 * This operation validates redemption eligibility (coupon status, expiry, user,
 * order context), enforces usage quota (one-use-per-coupon logic), and
 * atomically updates all entities to ensure integrity and atomicity. Only the
 * user to whom the coupon was issued may redeem it if it is still valid and
 * unused. On success, records the redemption and updates the issued coupon's
 * status. All operations are performed within a single transaction and are
 * audited for compliance.
 *
 * @param props - Parameters for redemption
 * @param props.seller - The authenticated seller issuing the API call
 *   (authorization enforced externally)
 * @param props.body - Redemption details: coupon issue ID, user ID, claimed
 *   redemption time, status, and optional order ID
 * @returns The newly created coupon use record with all fields populated
 * @throws {Error} When the coupon issue is not found, is deleted, already
 *   redeemed, not issued to the user, or expired
 */
export async function postaiCommerceSellerCouponUses(props: {
  seller: SellerPayload;
  body: IAiCommerceCouponUse.ICreate;
}): Promise<IAiCommerceCouponUse> {
  const { seller, body } = props;

  // Use a transaction to guarantee atomicity of validation, coupon_issue update, and use creation
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const couponIssue = await tx.ai_commerce_coupon_issues.findUnique({
      where: { id: body.coupon_issue_id },
    });
    if (!couponIssue) {
      throw new Error("Coupon issue not found");
    }
    if (couponIssue.deleted_at !== null) {
      throw new Error("Coupon issue record has been deleted");
    }
    if (couponIssue.status !== "issued") {
      throw new Error(
        "Coupon has already been redeemed or is not valid for redemption",
      );
    }
    if (couponIssue.issued_to !== body.user_id) {
      throw new Error("This coupon was not issued to this user");
    }
    // Coupon must not be expired; compare now to expires_at
    if (couponIssue.expires_at < body.redeemed_at) {
      throw new Error("Coupon has already expired");
    }
    // Enforce one-use-per-coupon by ensuring no existing redemption for this coupon_issue
    const priorRedemption = await tx.ai_commerce_coupon_uses.findFirst({
      where: {
        coupon_issue_id: body.coupon_issue_id,
        status: "redeemed",
      },
    });
    if (priorRedemption) {
      throw new Error("Coupon has already been redeemed");
    }
    // Atomically update coupon_issue status and create new coupon_use
    const now = body.redeemed_at;
    await tx.ai_commerce_coupon_issues.update({
      where: { id: body.coupon_issue_id },
      data: {
        status: "redeemed",
        redeemed_at: now,
        updated_at: now,
      },
    });
    const created = await tx.ai_commerce_coupon_uses.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        coupon_issue_id: body.coupon_issue_id,
        redeemed_by: body.user_id,
        order_id: body.order_id ?? undefined,
        status: body.status,
        redeemed_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      coupon_issue_id: created.coupon_issue_id,
      user_id: created.redeemed_by,
      status: created.status,
      redeemed_at: created.redeemed_at,
      order_id: created.order_id ?? undefined,
    };
  });
}
