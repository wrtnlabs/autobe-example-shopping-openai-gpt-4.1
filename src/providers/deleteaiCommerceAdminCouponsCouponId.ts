import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Erase a coupon record from ai_commerce_coupons (admin only, soft delete)
 *
 * This operation performs a soft delete of a coupon by setting the 'deleted_at'
 * timestamp field in the ai_commerce_coupons table, using the couponId
 * provided. Only admin users may invoke this operation. If the coupon is not
 * found or already soft-deleted, an error is thrown. The record remains in the
 * database for audit and compliance purposes, but is considered inactive for
 * business logic.
 *
 * @param props - The operation parameters object
 * @param props.admin - The authenticated admin payload (authorization required)
 * @param props.couponId - The UUID of the coupon to soft-delete
 * @returns Void
 * @throws {Error} If the coupon does not exist or has already been soft-deleted
 */
export async function deleteaiCommerceAdminCouponsCouponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { couponId } = props;
  // Ensure the coupon exists and is not already soft-deleted
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: {
      id: couponId,
      deleted_at: null,
    },
  });
  if (!coupon) {
    throw new Error("Coupon not found or already deleted");
  }
  // Soft delete: set deleted_at to current ISO string
  await MyGlobal.prisma.ai_commerce_coupons.update({
    where: { id: couponId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
