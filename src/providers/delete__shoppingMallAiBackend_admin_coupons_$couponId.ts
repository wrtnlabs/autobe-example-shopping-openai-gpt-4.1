import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Logically (soft) delete a coupon from the system.
 *
 * Soft-deletes a coupon by setting its deleted_at timestamp. Only active
 * (non-deleted) coupons can be soft deleted. The deletion provides compliance
 * and evidence retention, ensuring the coupon cannot be shown in user APIs but
 * remains for audit. Only administrators may invoke this operation. If the
 * coupon is already deleted or not found, throws an error.
 *
 * @param props - The deletion parameters
 * @param props.admin - AdminPayload for authorization (must be present)
 * @param props.couponId - UUID for the coupon to be soft deleted
 * @returns Void (no response body)
 * @throws {Error} If the coupon does not exist, or is already soft deleted
 */
export async function delete__shoppingMallAiBackend_admin_coupons_$couponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, couponId } = props;

  // Find coupon by id & ensure it is not already deleted
  const coupon =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: {
        id: couponId,
        deleted_at: null,
      },
    });
  if (!coupon) {
    throw new Error("Coupon not found or already deleted");
  }

  // Soft delete the coupon by updating deleted_at
  await MyGlobal.prisma.shopping_mall_ai_backend_coupons.update({
    where: { id: couponId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
