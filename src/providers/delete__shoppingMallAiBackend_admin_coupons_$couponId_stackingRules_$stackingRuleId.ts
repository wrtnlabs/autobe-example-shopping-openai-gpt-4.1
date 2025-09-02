import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently delete a stacking rule belonging to a coupon (hard delete).
 *
 * Deletes an existing stacking rule, irreversibly removing the combinability
 * logic and associated business restriction from the system. This operation
 * only allows admins to perform the action, and requires confirmation that the
 * stacking rule belongs to the specified coupon.
 *
 * No audit evidence or soft delete is retained: the row is physically deleted.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the deletion
 * @param props.couponId - UUID of the parent coupon of the stacking rule
 * @param props.stackingRuleId - UUID of the stacking rule to delete
 * @returns Void
 * @throws {Error} If the stacking rule does not exist or does not belong to the
 *   specified coupon
 */
export async function delete__shoppingMallAiBackend_admin_coupons_$couponId_stackingRules_$stackingRuleId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  stackingRuleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, couponId, stackingRuleId } = props;

  // STEP 1: Find stacking rule by primary key
  const stackingRule =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.findFirst(
      {
        where: { id: stackingRuleId },
      },
    );

  if (!stackingRule) {
    throw new Error("Stacking rule not found");
  }
  // STEP 2: Validate stacking rule belongs to given coupon
  if (stackingRule.shopping_mall_ai_backend_coupon_id !== couponId) {
    throw new Error("Stacking rule does not belong to the specified coupon");
  }

  // STEP 3: Hard delete (no soft delete, no audit evidence retained)
  await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.delete({
    where: { id: stackingRuleId },
  });
  // No return required (void)
}
