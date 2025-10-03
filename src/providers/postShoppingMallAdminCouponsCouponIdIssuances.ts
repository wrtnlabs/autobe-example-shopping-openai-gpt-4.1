import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponIssuance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCouponsCouponIdIssuances(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponIssuance.ICreate;
}): Promise<IShoppingMallCouponIssuance> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      id: props.couponId,
      deleted_at: null,
    },
  });
  if (!coupon) throw new HttpException("Coupon not found", 404);

  if (
    coupon.issuance_limit_total !== null &&
    coupon.issuance_limit_total !== undefined
  ) {
    const issuanceCount =
      await MyGlobal.prisma.shopping_mall_coupon_issuances.count({
        where: {
          shopping_mall_coupon_id: coupon.id,
          deleted_at: null,
        },
      });
    if (issuanceCount >= coupon.issuance_limit_total) {
      throw new HttpException(
        "Issuance limit for this coupon has been reached",
        409,
      );
    }
  }

  if (
    props.body.shopping_mall_customer_id !== undefined &&
    props.body.shopping_mall_customer_id !== null &&
    coupon.usage_limit_per_user !== null &&
    coupon.usage_limit_per_user !== undefined
  ) {
    const customerIssuanceCount =
      await MyGlobal.prisma.shopping_mall_coupon_issuances.count({
        where: {
          shopping_mall_coupon_id: coupon.id,
          shopping_mall_customer_id: props.body.shopping_mall_customer_id,
          deleted_at: null,
        },
      });
    if (customerIssuanceCount >= coupon.usage_limit_per_user) {
      throw new HttpException(
        "Customer issuance limit for this coupon reached",
        409,
      );
    }
  }

  const existingCode =
    await MyGlobal.prisma.shopping_mall_coupon_issuances.findFirst({
      where: {
        code: props.body.code,
        deleted_at: null,
      },
    });
  if (existingCode) {
    throw new HttpException("Coupon code already issued", 409);
  }

  let issuanceStatus = "active";
  if (
    props.body.expires_at !== undefined &&
    props.body.expires_at !== null &&
    props.body.expires_at <= props.body.issued_at
  ) {
    issuanceStatus = "expired";
  }

  const now = props.body.issued_at;
  const issuance = await MyGlobal.prisma.shopping_mall_coupon_issuances.create({
    data: {
      id: v4(),
      shopping_mall_coupon_id: props.couponId,
      shopping_mall_customer_id:
        props.body.shopping_mall_customer_id !== undefined
          ? props.body.shopping_mall_customer_id
          : null,
      code: props.body.code,
      issued_at: props.body.issued_at,
      expires_at:
        props.body.expires_at !== undefined ? props.body.expires_at : null,
      usage_limit:
        props.body.usage_limit !== undefined ? props.body.usage_limit : null,
      used_count: 0,
      status: issuanceStatus,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: issuance.id,
    shopping_mall_coupon_id: issuance.shopping_mall_coupon_id,
    shopping_mall_customer_id: issuance.shopping_mall_customer_id ?? undefined,
    code: issuance.code,
    issued_at: toISOStringSafe(issuance.issued_at),
    expires_at:
      issuance.expires_at !== null && issuance.expires_at !== undefined
        ? toISOStringSafe(issuance.expires_at)
        : undefined,
    usage_limit: issuance.usage_limit ?? undefined,
    used_count: issuance.used_count,
    status: issuance.status,
    created_at: toISOStringSafe(issuance.created_at),
    updated_at: toISOStringSafe(issuance.updated_at),
    deleted_at:
      issuance.deleted_at !== null && issuance.deleted_at !== undefined
        ? toISOStringSafe(issuance.deleted_at)
        : undefined,
  };
}
