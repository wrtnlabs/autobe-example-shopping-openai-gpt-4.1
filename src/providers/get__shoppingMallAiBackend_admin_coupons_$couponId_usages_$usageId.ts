import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponUsage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get full business/audit details of a specific coupon redemption record.
 *
 * Retrieves detailed information about a specific coupon usage (redemption)
 * instance by coupon and usage ID. This endpoint is intended for admin, audit,
 * or campaign review, providing a complete evidence record of who redeemed a
 * coupon, for what order, and with what outcome. Only authorized admin/business
 * users may use this endpoint. The result contains all fields necessary for
 * audit and compliance evidence.
 *
 * @param props - Object containing the admin authentication context and both
 *   coupon and usage UUID parameters
 * @param props.admin - AdminPayload representing the authenticated
 *   administrator using this endpoint
 * @param props.couponId - Coupon UUID (string & tags.Format<'uuid'>) to scope
 *   the coupon usage
 * @param props.usageId - Coupon usage UUID (string & tags.Format<'uuid'>) to
 *   uniquely identify the usage record
 * @returns Complete coupon redemption record and relevant trace/metadata as
 *   IShoppingMallAiBackendCouponUsage
 * @throws {Error} When coupon usage not found, or is not associated with the
 *   specified coupon
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_usages_$usageId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  usageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponUsage> {
  const { couponId, usageId } = props;
  // Step 1: Fetch the coupon usage record
  const usage =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_usages.findFirst({
      where: { id: usageId },
      include: { couponIssuance: true },
    });
  if (!usage) throw new Error("Coupon usage not found");
  // Step 2: Check that usage belongs to specified coupon (join through issuance)
  if (usage.couponIssuance.shopping_mall_ai_backend_coupon_id !== couponId) {
    throw new Error(
      "Access denied: Coupon usage does not belong to the specified coupon",
    );
  }
  // Step 3: Map query result to strict API result type, converting date fields as required
  return {
    id: usage.id,
    shopping_mall_ai_backend_coupon_issuance_id:
      usage.shopping_mall_ai_backend_coupon_issuance_id,
    shopping_mall_ai_backend_customer_id:
      usage.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_order_id:
      usage.shopping_mall_ai_backend_order_id ?? null,
    used_at: toISOStringSafe(usage.used_at),
    amount_discounted: usage.amount_discounted,
    status: usage.status,
    rolledback_at:
      usage.rolledback_at != null ? toISOStringSafe(usage.rolledback_at) : null,
  };
}
