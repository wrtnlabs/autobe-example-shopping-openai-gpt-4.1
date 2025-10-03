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

export async function getShoppingMallAdminCouponsCouponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCoupon> {
  const row = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      id: props.couponId,
      deleted_at: null,
    },
  });
  if (!row) {
    throw new HttpException("Coupon not found", 404);
  }
  return {
    id: row.id,
    shopping_mall_coupon_campaign_id:
      row.shopping_mall_coupon_campaign_id !== undefined &&
      row.shopping_mall_coupon_campaign_id !== null
        ? row.shopping_mall_coupon_campaign_id
        : undefined,
    code: row.code,
    title: row.title,
    description:
      row.description !== undefined && row.description !== null
        ? row.description
        : undefined,
    coupon_type: row.coupon_type,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    min_order_amount:
      row.min_order_amount !== undefined && row.min_order_amount !== null
        ? row.min_order_amount
        : undefined,
    max_discount_amount:
      row.max_discount_amount !== undefined && row.max_discount_amount !== null
        ? row.max_discount_amount
        : undefined,
    stackable: row.stackable,
    exclusive: row.exclusive,
    usage_limit_total:
      row.usage_limit_total !== undefined && row.usage_limit_total !== null
        ? row.usage_limit_total
        : undefined,
    usage_limit_per_user:
      row.usage_limit_per_user !== undefined &&
      row.usage_limit_per_user !== null
        ? row.usage_limit_per_user
        : undefined,
    issuance_limit_total:
      row.issuance_limit_total !== undefined &&
      row.issuance_limit_total !== null
        ? row.issuance_limit_total
        : undefined,
    issued_count: row.issued_count,
    used_count: row.used_count,
    issued_at:
      row.issued_at !== undefined && row.issued_at !== null
        ? toISOStringSafe(row.issued_at)
        : undefined,
    expires_at:
      row.expires_at !== undefined && row.expires_at !== null
        ? toISOStringSafe(row.expires_at)
        : undefined,
    business_status: row.business_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  };
}
