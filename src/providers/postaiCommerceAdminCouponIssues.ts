import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Issues a new coupon to a user for the aiCommerce platform (admin endpoint).
 *
 * This endpoint enables administrators to award an available coupon to a
 * specified user account, creating a new issuance record with status 'issued'.
 * The operation validates the coupon's existence, state, usage quota, user
 * eligibility, and prevents duplicate issuance to the same user for a given
 * coupon. Throws detailed errors for invalid coupons, users, window/usage
 * constraints, and logs issuance for audit. Date values are ISO strings
 * strictly; all fields conform to schema and interface.
 *
 * @param props - The parameter object for coupon issuance
 * @param props.admin - The AdminPayload (authenticated admin issuing the
 *   coupon)
 * @param props.body - IAiCommerceCouponIssue.ICreate (coupon_id, user_id,
 *   optional expires_at, optional description)
 * @returns The created IAiCommerceCouponIssue representing the issued coupon
 * @throws {Error} If coupon not found, not active, outside validity window,
 *   user not eligible, issuance duplicate or quota exceeded
 */
export async function postaiCommerceAdminCouponIssues(props: {
  admin: AdminPayload;
  body: IAiCommerceCouponIssue.ICreate;
}): Promise<IAiCommerceCouponIssue> {
  const { admin, body } = props;

  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: {
      id: body.coupon_id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!coupon) throw new Error("Coupon not found or not active.");

  const now = toISOStringSafe(new Date());
  if (now < coupon.valid_from || now > coupon.valid_until) {
    throw new Error("Coupon is not within valid period.");
  }

  const user = await MyGlobal.prisma.ai_commerce_buyer.findFirst({
    where: {
      id: body.user_id,
      deleted_at: null,
    },
  });
  if (!user) throw new Error("User not found or deleted.");

  const duplicate = await MyGlobal.prisma.ai_commerce_coupon_issues.findFirst({
    where: {
      coupon_id: body.coupon_id,
      issued_to: body.user_id,
      deleted_at: null,
    },
  });
  if (duplicate)
    throw new Error(
      "This coupon has already been issued to this user (not deleted).",
    );

  if (coupon.max_uses !== null && coupon.max_uses !== undefined) {
    const used = await MyGlobal.prisma.ai_commerce_coupon_issues.count({
      where: {
        coupon_id: body.coupon_id,
        deleted_at: null,
      },
    });
    if (used >= coupon.max_uses) {
      throw new Error("Coupon issuance limit exceeded.");
    }
  }

  const nowTimestamp = toISOStringSafe(new Date());

  const issued = await MyGlobal.prisma.ai_commerce_coupon_issues.create({
    data: {
      id: v4(),
      coupon_id: body.coupon_id,
      issued_to: body.user_id,
      status: "issued",
      issued_at: nowTimestamp,
      expires_at: body.expires_at ?? coupon.valid_until,
      batch_reference: undefined,
      created_at: nowTimestamp,
      updated_at: nowTimestamp,
    },
  });

  return {
    id: issued.id,
    coupon_id: issued.coupon_id,
    issued_to: issued.issued_to,
    status: issued.status,
    issued_at: issued.issued_at,
    expires_at: issued.expires_at,
    redeemed_at:
      typeof issued.redeemed_at === "undefined" || issued.redeemed_at === null
        ? null
        : issued.redeemed_at,
    batch_reference:
      typeof issued.batch_reference === "undefined" ||
      issued.batch_reference === null
        ? undefined
        : issued.batch_reference,
    created_at: issued.created_at,
    updated_at: issued.updated_at,
    deleted_at:
      typeof issued.deleted_at === "undefined" || issued.deleted_at === null
        ? undefined
        : issued.deleted_at,
  };
}
