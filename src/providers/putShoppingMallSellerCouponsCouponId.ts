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

export async function putShoppingMallSellerCouponsCouponId(props: {
  seller: SellerPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallCoupon.IUpdate;
}): Promise<IShoppingMallCoupon> {
  // 1. Find coupon, throw 404 if not found
  const prev = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { id: props.couponId },
  });
  if (!prev) throw new HttpException("Coupon not found", 404);

  // 2. Update the coupon with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { id: props.couponId },
    data: {
      shopping_mall_coupon_campaign_id:
        props.body.shopping_mall_coupon_campaign_id ?? undefined,
      code: props.body.code,
      title: props.body.title,
      description: props.body.description ?? undefined,
      coupon_type: props.body.coupon_type,
      discount_type: props.body.discount_type,
      discount_value: props.body.discount_value,
      min_order_amount: props.body.min_order_amount ?? undefined,
      max_discount_amount: props.body.max_discount_amount ?? undefined,
      stackable: props.body.stackable,
      exclusive: props.body.exclusive,
      usage_limit_total: props.body.usage_limit_total ?? undefined,
      usage_limit_per_user: props.body.usage_limit_per_user ?? undefined,
      issuance_limit_total: props.body.issuance_limit_total ?? undefined,
      issued_at: props.body.issued_at
        ? toISOStringSafe(props.body.issued_at)
        : undefined,
      expires_at: props.body.expires_at
        ? toISOStringSafe(props.body.expires_at)
        : undefined,
      business_status: props.body.business_status,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_coupon_campaign_id:
      updated.shopping_mall_coupon_campaign_id ?? undefined,
    code: updated.code,
    title: updated.title,
    description: updated.description ?? undefined,
    coupon_type: updated.coupon_type,
    discount_type: updated.discount_type,
    discount_value: updated.discount_value,
    min_order_amount: updated.min_order_amount ?? undefined,
    max_discount_amount: updated.max_discount_amount ?? undefined,
    stackable: updated.stackable,
    exclusive: updated.exclusive,
    usage_limit_total: updated.usage_limit_total ?? undefined,
    usage_limit_per_user: updated.usage_limit_per_user ?? undefined,
    issuance_limit_total: updated.issuance_limit_total ?? undefined,
    issued_count: updated.issued_count,
    used_count: updated.used_count,
    issued_at: updated.issued_at
      ? toISOStringSafe(updated.issued_at)
      : undefined,
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
