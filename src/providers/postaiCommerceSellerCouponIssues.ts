import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Issue a new coupon to a user (ai_commerce_coupon_issues table) for admin or
 * seller campaigns.
 *
 * Issues a specified coupon to a user by creating a new coupon issue record.
 * Validates coupon ownership, status, validity window, issuance quota, and
 * user/account eligibility before persistence. The created record is returned
 * as IAiCommerceCouponIssue, with all timestamps as ISO 8601 strings. Throws
 * error on any violation of business or data integrity rule (invalid coupon,
 * not issued by seller, already issued, over quota, user ineligible).
 *
 * @param props.seller - The authenticated seller's payload (seller/buyer UUID
 *   in id)
 * @param props.body - Coupon issuance creation request (coupon_id, user_id[,
 *   expires_at, description])
 * @returns The issued coupon record as persisted (IAiCommerceCouponIssue)
 * @throws {Error} If coupon invalid, not owned by seller, out of date, max
 *   usage reached, or user ineligible.
 */
export async function postaiCommerceSellerCouponIssues(props: {
  seller: SellerPayload;
  body: IAiCommerceCouponIssue.ICreate;
}): Promise<IAiCommerceCouponIssue> {
  const { seller, body } = props;

  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: {
      id: body.coupon_id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!coupon)
    throw new Error("Coupon does not exist, is inactive, or has been deleted.");

  if (coupon.issued_by !== seller.id)
    throw new Error("You are not authorized to issue this coupon.");

  const now = toISOStringSafe(new Date());
  if (now < toISOStringSafe(coupon.valid_from))
    throw new Error("Coupon is not yet valid (valid_from in future).");
  if (now > toISOStringSafe(coupon.valid_until))
    throw new Error("Coupon has expired or is not valid (valid_until passed).");

  if (coupon.max_uses !== null && coupon.max_uses !== undefined) {
    const issuedCount = await MyGlobal.prisma.ai_commerce_coupon_issues.count({
      where: {
        coupon_id: coupon.id,
        deleted_at: null,
      },
    });
    if (issuedCount >= coupon.max_uses)
      throw new Error("Coupon issue limit (max_uses) has been reached.");
  }

  const recipient = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      id: body.user_id,
      status: { not: "deleted" },
      deleted_at: null,
    },
  });
  if (!recipient)
    throw new Error(
      "User to receive coupon does not exist or has been deleted.",
    );

  const alreadyIssued =
    await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst({
      where: {
        coupon_id: coupon.id,
        issued_to: body.user_id,
        deleted_at: null,
      },
    });
  if (alreadyIssued)
    throw new Error("This coupon has already been issued to the target user.");

  const id = v4() as string & tags.Format<"uuid">;
  // Determine expires_at: prefer explicit, else coupon's valid_until
  const expires_at = body.expires_at ?? toISOStringSafe(coupon.valid_until);

  const nowTimestamp = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ai_commerce_coupon_issues.create({
    data: {
      id,
      coupon_id: coupon.id,
      issued_to: body.user_id,
      status: "issued",
      issued_at: nowTimestamp,
      expires_at,
      created_at: nowTimestamp,
      updated_at: nowTimestamp,
      // batch_reference, redeemed_at, deleted_at omitted (remain undefined/null by schema default)
    },
  });

  return {
    id: created.id,
    coupon_id: created.coupon_id,
    issued_to: created.issued_to,
    status: created.status,
    issued_at: toISOStringSafe(created.issued_at),
    expires_at: toISOStringSafe(created.expires_at),
    redeemed_at: created.redeemed_at
      ? toISOStringSafe(created.redeemed_at)
      : undefined,
    batch_reference: created.batch_reference ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
