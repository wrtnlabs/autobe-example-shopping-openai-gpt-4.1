import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Fetch details of a specific coupon use event from ai_commerce_coupon_uses by
 * couponUseId
 *
 * Retrieves details about a specific coupon redemption event from
 * ai_commerce_coupon_uses table by couponUseId, returning user, coupon, order,
 * status, and timing information. Used for compliance, audit, support, or
 * campaign impact analysis. Only admins may access this endpoint; attempts to
 * access deleted or non-existent resources will result in an error. All
 * date/time values are ISO strings. Soft-deleted coupon issues are inaccessible
 * via this endpoint.
 *
 * @param props - The parameter object
 * @param props.admin - Authenticated admin payload (must have global admin
 *   privileges)
 * @param props.couponUseId - Unique identifier for the coupon usage/redemption
 *   event to retrieve.
 * @returns Full IAiCommerceCouponUse with all type-safe fields (dates string,
 *   ids uuid)
 * @throws {Error} If the coupon use record is not found, or if the associated
 *   coupon issue has been deleted (soft delete)
 */
export async function getaiCommerceAdminCouponUsesCouponUseId(props: {
  admin: AdminPayload;
  couponUseId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCouponUse> {
  const { couponUseId } = props;

  // Fetch coupon use event by PK
  const useRecord = await MyGlobal.prisma.ai_commerce_coupon_uses.findUnique({
    where: { id: couponUseId },
  });
  if (!useRecord) throw new Error("Coupon use record not found");

  // Check parent coupon_issue (must not be soft-deleted)
  const issue = await MyGlobal.prisma.ai_commerce_coupon_issues.findUnique({
    where: { id: useRecord.coupon_issue_id },
  });
  if (!issue || issue.deleted_at !== null)
    throw new Error("Coupon issue deleted or not found");

  // Map nullable/optional order_id correctly: retains null, omits undefined
  return {
    id: useRecord.id,
    coupon_issue_id: useRecord.coupon_issue_id,
    user_id: useRecord.user_id,
    status: useRecord.status,
    redeemed_at: toISOStringSafe(useRecord.redeemed_at),
    order_id: useRecord.order_id ?? undefined,
  };
}
