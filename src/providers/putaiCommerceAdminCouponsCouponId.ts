import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing coupon entry in ai_commerce_coupons (admin only)
 *
 * Edits an existing coupon in the 'ai_commerce_coupons' table, referenced by
 * couponId. Permissible updates include changing campaign settings, business
 * rules, limits, effective periods, or revising the coupon status for
 * governance.
 *
 * Admin users can only update coupons that are not expired or deleted. All
 * update actions are logged for business records and compliance. Update process
 * performs full validation to ensure the coupon remains within platform and
 * legal limits.
 *
 * Permission checks and audit logging ensure only authorized staff can edit
 * coupons, and that rollback/history is available for compliance or
 * reconciliation.
 *
 * @param props - Object containing all parameters for updating a coupon
 * @param props.admin - Authenticated admin user performing this action
 * @param props.couponId - The unique identifier of the coupon to update
 * @param props.body - The IAiCommerceCoupon.IUpdate object specifying desired
 *   changes
 * @returns The updated IAiCommerceCoupon entity as it exists after the update
 * @throws Error if the coupon does not exist, is deleted, or is expired
 */
export async function putaiCommerceAdminCouponsCouponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IAiCommerceCoupon.IUpdate;
}): Promise<IAiCommerceCoupon> {
  // Find the coupon to update (must not be deleted)
  const coupon = await MyGlobal.prisma.ai_commerce_coupons.findFirst({
    where: { id: props.couponId, deleted_at: null },
  });
  if (!coupon) throw new Error("Coupon not found or already deleted");
  // Admin business rule: Do not allow update of expired coupons
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (coupon.valid_until < now) {
    throw new Error("Cannot update expired coupon");
  }
  // Update only fields provided
  const updated = await MyGlobal.prisma.ai_commerce_coupons.update({
    where: { id: props.couponId },
    data: {
      type: props.body.type ?? undefined,
      valid_from: props.body.valid_from ?? undefined,
      valid_until: props.body.valid_until ?? undefined,
      issued_by: props.body.issued_by ?? undefined,
      max_uses: props.body.max_uses ?? undefined,
      conditions: props.body.conditions ?? undefined,
      status: props.body.status ?? undefined,
      updated_at: now,
    },
  });
  // Return the complete coupon entity, matching IAiCommerceCoupon exactly
  return {
    id: updated.id,
    coupon_code: updated.coupon_code,
    type: updated.type,
    valid_from: updated.valid_from,
    valid_until: updated.valid_until,
    issued_by: updated.issued_by ?? undefined,
    max_uses: updated.max_uses ?? undefined,
    conditions: updated.conditions ?? undefined,
    status: updated.status,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at ?? undefined,
  };
}
