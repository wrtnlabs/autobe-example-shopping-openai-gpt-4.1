import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new stacking rule for a specified coupon.
 *
 * This operation writes a new coupon stacking rule to the
 * shopping_mall_ai_backend_coupon_stacking_rules table, linking it to the given
 * coupon by couponId. Only admin users are permitted to perform this action.
 * The logic enforces prevention of duplicate stacking rules (same coupon,
 * exclusion, applies_to_type, and type). Returns the full created stacking rule
 * record for downstream business logic.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.couponId - The target coupon's UUID for which the stacking rule
 *   is to be created
 * @param props.body - The stacking rule creation input, specifying exclusion,
 *   type, and (optionally) applies_to_type
 * @returns The created coupon stacking rule entry with all relevant fields
 *   strictly typed
 * @throws {Error} If a stacking rule for the same (coupon, exclusion,
 *   applies_to_type, type) already exists
 * @throws {Error} If admin authentication is missing/invalid (enforced by
 *   decorator and business logic)
 */
export async function post__shoppingMallAiBackend_admin_coupons_$couponId_stackingRules(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponStackingRule.ICreate;
}): Promise<IShoppingMallAiBackendCouponStackingRule> {
  const { admin, couponId, body } = props;

  // Double-check admin presence (decorator ensures it, but business logic must as well)
  if (!admin || !admin.id || admin.type !== "admin") {
    throw new Error(
      "Unauthorized: Only system admins can create coupon stacking rules.",
    );
  }

  // Check for duplicate stacking rule
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.findFirst(
      {
        where: {
          shopping_mall_ai_backend_coupon_id: couponId,
          excluded_coupon_id: body.excluded_coupon_id ?? null,
          applies_to_type: body.applies_to_type ?? null,
          type: body.type,
        },
      },
    );
  if (duplicate)
    throw new Error(
      "Duplicate stacking rule not allowed for this coupon and exclusion.",
    );

  // Insert new stacking rule
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_stacking_rules.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_ai_backend_coupon_id: couponId,
          excluded_coupon_id: body.excluded_coupon_id ?? null,
          type: body.type,
          applies_to_type: body.applies_to_type ?? null,
          created_at: now,
        },
      },
    );

  // Strict return mapping
  return {
    id: created.id,
    shopping_mall_ai_backend_coupon_id:
      created.shopping_mall_ai_backend_coupon_id,
    excluded_coupon_id: created.excluded_coupon_id ?? null,
    type: created.type,
    applies_to_type: created.applies_to_type ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
