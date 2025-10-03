import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponsCouponIdIssuancesIssuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch issuance by id + couponId, check not already deleted.
  const issuance =
    await MyGlobal.prisma.shopping_mall_coupon_issuances.findFirst({
      where: {
        id: props.issuanceId,
        shopping_mall_coupon_id: props.couponId,
      },
    });
  if (!issuance) {
    throw new HttpException("Coupon issuance not found.", 404);
  }
  if (issuance.deleted_at) {
    // Already deleted — idempotent, treat as success.
    return;
  }
  // Check referential integrity: prevent deleting if status is in redeem/used (e.g., 'redeemed', 'expired'). Allow 'active', 'pending', only.
  if (issuance.status !== "active" && issuance.status !== "pending") {
    throw new HttpException(
      "Cannot delete: Issuance already used or revoked.",
      409,
    );
  }
  // Soft-delete by setting deleted_at.
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_coupon_issuances.update({
    where: { id: props.issuanceId },
    data: { deleted_at: now },
  });
}
