import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get the configuration and details of a stacking rule for a given coupon.
 *
 * Retrieve full details of a coupon stacking rule, including its stacking type,
 * target, and business applicability. This API allows administrators and
 * authorized business managers to verify how a coupon interacts with other
 * discount policies.
 *
 * The operation checks the requested stacking rule entry under the provided
 * couponId to ensure correct scoping and security. This call is vital for
 * compliance, debugging promotion issues, and supporting transparent
 * configuration audits. Any configuration retrieved can be compared against
 * audit logs for change tracking.
 *
 * Only accessible to admin users. Stacking rules have direct business and
 * financial implications, so access is restricted. Throws if the stacking rule
 * is not found under the specified coupon.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user context. Required.
 * @param props.couponId - Unique identifier for the coupon whose stacking rule
 *   is being retrieved
 * @param props.stackingRuleId - Unique identifier for the stacking rule to
 *   retrieve
 * @returns Details of the coupon stacking rule including combinability and
 *   target information
 * @throws {Error} If no stacking rule exists for the given coupon and id, or
 *   access is not permitted.
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_stackingRules_$stackingRuleId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  stackingRuleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponStackingRule> {
  const { admin, couponId, stackingRuleId } = props;

  // Query stacking rule scoped to the couponId and stackingRuleId.
  const stackingRule =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.findFirst(
      {
        where: {
          id: stackingRuleId,
          shopping_mall_ai_backend_coupon_id: couponId,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_coupon_id: true,
          excluded_coupon_id: true,
          type: true,
          applies_to_type: true,
          created_at: true,
        },
      },
    );
  if (!stackingRule) {
    throw new Error("Coupon stacking rule not found");
  }

  return {
    id: stackingRule.id,
    shopping_mall_ai_backend_coupon_id:
      stackingRule.shopping_mall_ai_backend_coupon_id,
    excluded_coupon_id: stackingRule.excluded_coupon_id,
    type: stackingRule.type,
    applies_to_type: stackingRule.applies_to_type,
    created_at: toISOStringSafe(stackingRule.created_at),
  };
}
