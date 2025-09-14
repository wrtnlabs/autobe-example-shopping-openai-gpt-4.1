import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently deletes a coupon use record by couponUseId.
 *
 * This endpoint can only be called by privileged seller users. It physically
 * removes the ai_commerce_coupon_uses record matching the specified
 * couponUseId, but only if the record is not finalized (e.g., not
 * settled/audited). Attempts to delete finalized or previously audited records
 * are denied for compliance reasons. All deletions are logged to the coupon
 * audit table for evidence and traceability.
 *
 * @param props - Operation arguments
 * @param props.seller - The authenticated seller invoking the deletion
 * @param props.couponUseId - The UUID of the coupon use/redemption record to
 *   physically remove
 * @returns Void
 * @throws {Error} When the coupon use does not exist or may not be deleted
 */
export async function deleteaiCommerceSellerCouponUsesCouponUseId(props: {
  seller: SellerPayload;
  couponUseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, couponUseId } = props;

  // 1. Find coupon use record (must exist)
  const couponUse = await MyGlobal.prisma.ai_commerce_coupon_uses.findUnique({
    where: { id: couponUseId },
  });
  if (!couponUse) throw new Error("Coupon use record not found");

  // 2. Only unfinalized (non-settled/audited) records may be deleted
  const finalizedStatuses = [
    "settled",
    "audited",
    "completed",
    "finalized",
    "reversed",
    "expired",
    "revoked",
  ];
  if (finalizedStatuses.includes(couponUse.status.trim().toLowerCase())) {
    throw new Error(
      "Cannot delete a finalized or post-settlement coupon use record",
    );
  }

  // 3. Perform physical (hard) delete
  await MyGlobal.prisma.ai_commerce_coupon_uses.delete({
    where: { id: couponUseId },
  });

  // 4. Record audit trail
  // We lack a direct coupon_id in the coupon_use row, so record coupon_issue_id as best available context
  await MyGlobal.prisma.ai_commerce_coupon_audits.create({
    data: {
      id: v4(),
      coupon_id: couponUse.coupon_issue_id,
      event_type: "delete_use",
      event_reference: couponUseId,
      note: `Coupon use hard-deleted by seller ${seller.id} at ${toISOStringSafe(new Date())}`,
      event_timestamp: toISOStringSafe(new Date()),
    },
  });

  // Done
}
