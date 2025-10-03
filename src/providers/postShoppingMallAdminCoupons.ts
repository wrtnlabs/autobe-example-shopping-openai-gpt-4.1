import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.ICreate;
}): Promise<IShoppingMallCoupon> {
  // Unique code check
  const existing = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      code: props.body.code,
    },
  });
  if (existing) {
    throw new HttpException("Coupon code already exists", 409);
  }

  // Validate campaign existence if provided
  if (
    props.body.shopping_mall_coupon_campaign_id !== undefined &&
    props.body.shopping_mall_coupon_campaign_id !== null
  ) {
    const foundCampaign =
      await MyGlobal.prisma.shopping_mall_coupon_campaigns.findFirst({
        where: {
          id: props.body.shopping_mall_coupon_campaign_id,
          deleted_at: null,
        },
      });
    if (!foundCampaign) {
      throw new HttpException("Coupon campaign does not exist", 404);
    }
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_coupons.create({
    data: {
      id: v4(),
      shopping_mall_coupon_campaign_id:
        props.body.shopping_mall_coupon_campaign_id ?? null,
      code: props.body.code,
      title: props.body.title,
      description: props.body.description ?? null,
      coupon_type: props.body.coupon_type,
      discount_type: props.body.discount_type,
      discount_value: props.body.discount_value,
      min_order_amount: props.body.min_order_amount ?? null,
      max_discount_amount: props.body.max_discount_amount ?? null,
      stackable: props.body.stackable,
      exclusive: props.body.exclusive,
      usage_limit_total: props.body.usage_limit_total ?? null,
      usage_limit_per_user: props.body.usage_limit_per_user ?? null,
      issuance_limit_total: props.body.issuance_limit_total ?? null,
      issued_count: 0,
      used_count: 0,
      issued_at: props.body.issued_at ?? null,
      expires_at: props.body.expires_at ?? null,
      business_status: props.body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_coupon_campaign_id:
      created.shopping_mall_coupon_campaign_id ?? undefined,
    code: created.code,
    title: created.title,
    description: created.description ?? undefined,
    coupon_type: created.coupon_type,
    discount_type: created.discount_type,
    discount_value: created.discount_value,
    min_order_amount: created.min_order_amount ?? undefined,
    max_discount_amount: created.max_discount_amount ?? undefined,
    stackable: created.stackable,
    exclusive: created.exclusive,
    usage_limit_total: created.usage_limit_total ?? undefined,
    usage_limit_per_user: created.usage_limit_per_user ?? undefined,
    issuance_limit_total: created.issuance_limit_total ?? undefined,
    issued_count: created.issued_count,
    used_count: created.used_count,
    issued_at: created.issued_at
      ? toISOStringSafe(created.issued_at)
      : undefined,
    expires_at: created.expires_at
      ? toISOStringSafe(created.expires_at)
      : undefined,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
