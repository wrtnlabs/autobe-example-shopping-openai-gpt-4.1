import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponsCouponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { couponId } = props;
  // Lookup coupon not deleted
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      id: couponId,
      deleted_at: null,
    },
  });
  if (!coupon) {
    throw new HttpException("Coupon not found or already deleted", 404);
  }

  // Business rule: cannot delete if coupon is active/paused and not yet expired
  const now = toISOStringSafe(new Date());
  // Ensure coupon.expires_at is string for comparison
  const expiresAtStr =
    coupon.expires_at instanceof Date
      ? toISOStringSafe(coupon.expires_at)
      : coupon.expires_at;
  if (
    (coupon.business_status === "active" ||
      coupon.business_status === "paused") &&
    (expiresAtStr === null || (expiresAtStr && expiresAtStr > now))
  ) {
    throw new HttpException(
      "Cannot delete an active or paused coupon that is not expired.",
      409,
    );
  }

  // Usage/issuance dependency checks
  const activeIssuance =
    await MyGlobal.prisma.shopping_mall_coupon_issuances.findFirst({
      where: {
        shopping_mall_coupon_id: couponId,
        status: "active",
      },
    });
  if (activeIssuance) {
    throw new HttpException(
      "Cannot delete a coupon with active issuances.",
      409,
    );
  }

  const hasUsages = await MyGlobal.prisma.shopping_mall_coupon_usages.findFirst(
    {
      where: {
        shopping_mall_coupon_id: couponId,
      },
    },
  );
  if (hasUsages) {
    throw new HttpException(
      "Cannot delete a coupon that has already been used.",
      409,
    );
  }

  // Soft delete: set deleted_at and business_status, and updated_at
  await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { id: couponId },
    data: {
      deleted_at: now,
      business_status: "deleted",
      updated_at: now,
    },
  });
}
