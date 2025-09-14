import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a single coupon from ai_commerce_coupons
 * (admin only)
 *
 * This operation fetches a specific coupon by its UUID from the
 * ai_commerce_coupons table, ensuring the coupon is not soft deleted. All
 * fields, including business rule values and campaign configuration, are
 * returned as part of the IAiCommerceCoupon DTO. Authorization is restricted to
 * admin users. If the coupon is not found or has been soft deleted, an error is
 * thrown. Date/time fields are formatted according to ISO 8601 and type
 * branded. Optional fields are mapped according to DTO semantics, with
 * undefined used for missing values where appropriate.
 *
 * @param props - The authenticated admin and couponId parameters
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.couponId - The unique identifier of the coupon to fetch
 * @returns The coupon data as IAiCommerceCoupon, with all business rule and
 *   configuration fields.
 * @throws Error when the coupon is not found (missing or deleted) or access is
 *   unauthorized
 */
export async function getaiCommerceAdminCouponsCouponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCoupon> {
  const { couponId } = props;
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: { id: couponId, deleted_at: null },
  });
  if (coupon === null) {
    throw new Error("Coupon not found");
  }
  return {
    id: coupon.id,
    coupon_code: coupon.coupon_code,
    type: coupon.type,
    valid_from: toISOStringSafe(coupon.valid_from),
    valid_until: toISOStringSafe(coupon.valid_until),
    issued_by: coupon.issued_by === null ? undefined : coupon.issued_by,
    max_uses: coupon.max_uses === null ? undefined : coupon.max_uses,
    conditions: coupon.conditions === null ? undefined : coupon.conditions,
    status: coupon.status,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at:
      coupon.deleted_at === null
        ? undefined
        : toISOStringSafe(coupon.deleted_at),
  };
}
