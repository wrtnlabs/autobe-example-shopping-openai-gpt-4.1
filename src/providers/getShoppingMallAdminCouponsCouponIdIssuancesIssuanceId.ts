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

export async function getShoppingMallAdminCouponsCouponIdIssuancesIssuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCouponIssuance> {
  const record = await MyGlobal.prisma.shopping_mall_coupon_issuances.findFirst(
    {
      where: {
        id: props.issuanceId,
        shopping_mall_coupon_id: props.couponId,
        deleted_at: null,
      },
    },
  );
  if (!record) {
    throw new HttpException("Coupon issuance not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_coupon_id: record.shopping_mall_coupon_id,
    shopping_mall_customer_id:
      record.shopping_mall_customer_id === null
        ? undefined
        : record.shopping_mall_customer_id,
    code: record.code,
    issued_at: toISOStringSafe(record.issued_at),
    expires_at:
      record.expires_at === null
        ? undefined
        : toISOStringSafe(record.expires_at),
    usage_limit: record.usage_limit === null ? undefined : record.usage_limit,
    used_count: record.used_count,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
