import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing stacking rule for a specific coupon.
 *
 * Modifies the parameters of a stacking rule that governs how the coupon is
 * combined with other discounts, including changes to the type of stacking,
 * exclusions, or overrides.
 *
 * Only administrators may perform this operation. All modifications are subject
 * to audit and compliance policies, and the result is instantly reflected in
 * business logic.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the change (authorization
 *   required)
 * @param props.couponId - Unique identifier for the coupon whose stacking rule
 *   is being updated
 * @param props.stackingRuleId - Unique identifier for the stacking rule to
 *   update
 * @param props.body - Updated stacking rule configuration (partial update, only
 *   included fields are changed)
 * @returns The updated stacking rule object including all business
 *   configuration fields
 * @throws {Error} If the admin is not authorized or the stacking rule does not
 *   exist
 */
export async function put__shoppingMallAiBackend_admin_coupons_$couponId_stackingRules_$stackingRuleId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  stackingRuleId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponStackingRule.IUpdate;
}): Promise<IShoppingMallAiBackendCouponStackingRule> {
  const { admin, stackingRuleId, body } = props;

  // Authorization: validate admin is active
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: { id: admin.id, is_active: true, deleted_at: null },
    });
  if (!adminRecord) {
    throw new Error("Unauthorized: Invalid admin account");
  }

  // Check if stacking rule exists
  const stackingRule =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.findFirst(
      {
        where: { id: stackingRuleId },
      },
    );
  if (!stackingRule) {
    throw new Error("Stacking rule not found");
  }

  // Update the stacking rule with only explicitly provided fields
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.update(
      {
        where: { id: stackingRuleId },
        data: {
          shopping_mall_ai_backend_coupon_id:
            body.shopping_mall_ai_backend_coupon_id ?? undefined,
          excluded_coupon_id: body.excluded_coupon_id ?? undefined,
          type: body.type ?? undefined,
          applies_to_type: body.applies_to_type ?? undefined,
        },
      },
    );

  return {
    id: updated.id,
    shopping_mall_ai_backend_coupon_id:
      updated.shopping_mall_ai_backend_coupon_id ?? null,
    excluded_coupon_id: updated.excluded_coupon_id ?? null,
    type: updated.type,
    applies_to_type: updated.applies_to_type ?? null,
    created_at: toISOStringSafe(updated.created_at),
  };
}
