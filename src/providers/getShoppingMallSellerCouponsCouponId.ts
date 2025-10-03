import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerCouponsCouponId(props: {
  seller: SellerPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCoupon> {
  // Find coupon by ID, ensure not soft-deleted
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      id: props.couponId,
      deleted_at: null,
    },
  });
  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }

  // Map Prisma record to IShoppingMallCoupon, handling optional/nullable fields and date conversions properly
  return {
    id: coupon.id,
    shopping_mall_coupon_campaign_id:
      coupon.shopping_mall_coupon_campaign_id ?? undefined,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description ?? undefined,
    coupon_type: coupon.coupon_type,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    min_order_amount: coupon.min_order_amount ?? undefined,
    max_discount_amount: coupon.max_discount_amount ?? undefined,
    stackable: coupon.stackable,
    exclusive: coupon.exclusive,
    usage_limit_total: coupon.usage_limit_total ?? undefined,
    usage_limit_per_user: coupon.usage_limit_per_user ?? undefined,
    issuance_limit_total: coupon.issuance_limit_total ?? undefined,
    issued_count: coupon.issued_count,
    used_count: coupon.used_count,
    issued_at: coupon.issued_at ? toISOStringSafe(coupon.issued_at) : undefined,
    expires_at: coupon.expires_at
      ? toISOStringSafe(coupon.expires_at)
      : undefined,
    business_status: coupon.business_status,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at: coupon.deleted_at
      ? toISOStringSafe(coupon.deleted_at)
      : undefined,
  };
}
