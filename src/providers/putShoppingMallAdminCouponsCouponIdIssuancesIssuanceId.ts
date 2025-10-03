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

export async function putShoppingMallAdminCouponsCouponIdIssuancesIssuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponIssuance.IUpdate;
}): Promise<IShoppingMallCouponIssuance> {
  const { couponId, issuanceId, body } = props;
  // Step 1: Get the specific issuance (checks coupon and deletion)
  const issuance =
    await MyGlobal.prisma.shopping_mall_coupon_issuances.findFirst({
      where: {
        id: issuanceId,
        shopping_mall_coupon_id: couponId,
        deleted_at: null,
      },
    });
  if (!issuance) {
    throw new HttpException(
      "Coupon issuance not found for given coupon and issuance ID",
      404,
    );
  }
  // Business: Coupon linkage immutable. (Redundant here, since couponId is used for lookup)

  // Business: Disallow status transition revoked->active
  if (
    typeof body.status === "string" &&
    issuance.status === "revoked" &&
    body.status === "active"
  ) {
    throw new HttpException("Cannot re-activate a revoked issuance", 409);
  }
  // Only allow fields in DTO to update
  const updated = await MyGlobal.prisma.shopping_mall_coupon_issuances.update({
    where: { id: issuanceId },
    data: {
      expires_at:
        body.expires_at !== undefined ? (body.expires_at ?? null) : undefined,
      usage_limit:
        body.usage_limit !== undefined ? (body.usage_limit ?? null) : undefined,
      status: body.status !== undefined ? body.status : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return using IShoppingMallCouponIssuance type: convert Dates to string, handle nulls/undefined
  return {
    id: updated.id,
    shopping_mall_coupon_id: updated.shopping_mall_coupon_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    code: updated.code,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    usage_limit:
      typeof updated.usage_limit === "number" ? updated.usage_limit : undefined,
    used_count: updated.used_count,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
