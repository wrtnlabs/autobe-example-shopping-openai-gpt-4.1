import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete an issuance record (logical removal for auditing, not physical
 * delete).
 *
 * Logically deletes an existing coupon issuance for a given coupon and
 * issuance. This sets the deleted_at timestamp for compliance and audit
 * purposes, preserving the record but making it inactive.
 *
 * The operation ensures that only admin users (validated via props.admin) are
 * allowed. It checks that the issuance exists, is not already deleted, and has
 * not been used (redeemed) or revoked. Attempts to delete a redeemed or
 * non-existent issuance throw a business error according to compliance and
 * anti-fraud rules.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.couponId - Coupon ID the issuance belongs to
 * @param props.issuanceId - Coupon issuance record identifier to logically
 *   delete
 * @returns Void
 * @throws {Error} When the issuance does not exist, is already deleted, or has
 *   been redeemed or revoked
 */
export async function delete__shoppingMallAiBackend_admin_coupons_$couponId_issuances_$issuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, couponId, issuanceId } = props;

  // Find the issuance by id + coupon id
  const issuance =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.findFirst({
      where: {
        id: issuanceId,
        shopping_mall_ai_backend_coupon_id: couponId,
      },
    });
  if (!issuance || issuance.deleted_at != null) {
    throw new Error("Issuance does not exist or has already been deleted.");
  }
  if (issuance.used_at != null) {
    throw new Error("Cannot delete a redeemed issuance.");
  }
  if (issuance.revoked_at != null) {
    throw new Error("Cannot delete a revoked issuance.");
  }
  // Soft delete: set deleted_at (use toISOStringSafe for proper branding)
  await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.update({
    where: { id: issuanceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
