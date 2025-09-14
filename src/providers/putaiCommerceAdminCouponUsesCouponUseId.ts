import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a coupon use/redemption in ai_commerce_coupon_uses by couponUseId
 * (admin/seller corrections).
 *
 * Allows authorized admins to change status ('revoked', etc.), correct event
 * metadata or order association for fraud/system error cases. Prohibits updates
 * for finalized, expired, or audited status by business rules. Every update is
 * trace-logged by external audit logic. Only fields present in the request body
 * are modified; absent fields are omitted (not overwritten). All date values
 * are handled as ISO strings.
 *
 * @param props - Parameters for the update
 * @param props.admin - Authenticated admin performing the operation
 * @param props.couponUseId - UUID of the coupon use event to update
 * @param props.body - Update fields: may include status, order_id, event
 *   metadata, or administrative corrections
 * @returns The updated coupon use event as IAiCommerceCouponUse
 * @throws {Error} If the coupon use is finalized, expired, or disallowed for
 *   update per business policy
 */
export async function putaiCommerceAdminCouponUsesCouponUseId(props: {
  admin: AdminPayload;
  couponUseId: string & tags.Format<"uuid">;
  body: IAiCommerceCouponUse.IUpdate;
}): Promise<IAiCommerceCouponUse> {
  const { admin, couponUseId, body } = props;

  // Retrieve current coupon use record to check business rules
  const current =
    await MyGlobal.prisma.ai_commerce_coupon_uses.findUniqueOrThrow({
      where: { id: couponUseId },
    });

  // Enforce business validation: prohibit certain transitions
  if (
    current.status === "finalized" ||
    current.status === "expired" ||
    current.status === "audited"
  ) {
    throw new Error(
      "Update not allowed: coupon use is finalized, expired, or audited",
    );
  }

  // Prepare update data object explicitly (only assign provided fields)
  const updateData: {
    coupon_issue_id?: string;
    redeemed_by?: string;
    order_id?: string | null;
    redeemed_at?: (string & tags.Format<"date-time">) | null;
    status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.coupon_issue_id !== undefined) {
    updateData.coupon_issue_id = body.coupon_issue_id;
  }
  if (body.redeemed_by !== undefined) {
    updateData.redeemed_by = body.redeemed_by;
  }
  if (body.order_id !== undefined) {
    updateData.order_id = body.order_id;
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  // For nullable date-time, assign null only if it's present as null; else convert if present
  if (body.redeemed_at !== undefined) {
    updateData.redeemed_at =
      body.redeemed_at === null ? null : toISOStringSafe(body.redeemed_at);
  }

  // Update the record
  const updated = await MyGlobal.prisma.ai_commerce_coupon_uses.update({
    where: { id: couponUseId },
    data: updateData,
  });

  // Map db fields to DTO
  return {
    id: updated.id,
    coupon_issue_id: updated.coupon_issue_id,
    user_id: updated.redeemed_by,
    status: updated.status,
    redeemed_at: updated.redeemed_at
      ? toISOStringSafe(updated.redeemed_at)
      : null,
    order_id: updated.order_id ?? undefined,
  };
}
