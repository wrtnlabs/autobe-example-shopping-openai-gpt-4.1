import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a coupon use (redemption) record by couponUseId, only if
 * not finalized.
 *
 * This operation allows a privileged admin to physically remove a coupon
 * redemption from the ai_commerce_coupon_uses table, strictly when its status
 * is not finalized ('settled', 'audited', 'finalized'). If the coupon use is
 * already settled or audited, deletion is forbidden for compliance reasons. All
 * deletions are logged in ai_commerce_coupon_audits with full audit context.
 *
 * @param props - The request props
 * @param props.admin - The authenticated admin performing this operation
 * @param props.couponUseId - The id (UUID) of the coupon use record to delete
 * @returns Void
 * @throws {Error} If the coupon use record is not found
 * @throws {Error} If the coupon use is finalized and may not be deleted
 */
export async function deleteaiCommerceAdminCouponUsesCouponUseId(props: {
  admin: AdminPayload;
  couponUseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, couponUseId } = props;
  // Finalized statuses that forbid physical deletion
  const FINALIZED_STATUSES: readonly string[] = [
    "settled",
    "audited",
    "finalized",
  ];

  // Lookup coupon use record
  const couponUse = await MyGlobal.prisma.ai_commerce_coupon_uses.findUnique({
    where: { id: couponUseId },
  });
  if (couponUse === null) {
    throw new Error("Coupon use record not found");
  }
  if (FINALIZED_STATUSES.includes(couponUse.status)) {
    throw new Error("Cannot delete a finalized coupon use record");
  }

  // Atomic delete and audit with transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ai_commerce_coupon_uses.delete({
      where: { id: couponUseId },
    }),
    MyGlobal.prisma.ai_commerce_coupon_audits.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        coupon_id: couponUse.coupon_issue_id,
        event_type: "erase",
        event_reference: couponUseId,
        note: `Coupon use deleted by admin ${admin.id}`,
        event_timestamp: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
