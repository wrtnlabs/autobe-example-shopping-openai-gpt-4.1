import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing coupon restriction for a coupon, altering its
 * applicability, limited users/products, or other business logic.
 *
 * This operation allows for adjustment of restriction logic in response to
 * changing business needs, policy updates, or compliance requirements. It
 * modifies the restriction entry and reflects changes instantly for
 * customer-facing eligibility checks.
 *
 * Validation ensures no duplication or overlap of restriction logic, and
 * changes are logged for future audit and compliance review. This endpoint
 * should be used only by authorized admins with business-level training, as
 * promotions and compliance can be deeply affected if restrictions are
 * incorrectly configured.
 *
 * @param props - Request parameter object containing admin authentication,
 *   coupon and restriction IDs, and DTO of update fields
 * @param props.admin - The authenticated admin
 * @param props.couponId - The coupon to update restriction for (must match
 *   restriction in DB)
 * @param props.restrictionId - The coupon restriction ID to update
 * @param props.body - Update data object (restriction logic, scope, event
 *   window, etc)
 * @returns The updated IShoppingMallAiBackendCouponRestriction object
 * @throws {Error} When restrictionId not found or does not belong to coupon
 */
export async function put__shoppingMallAiBackend_admin_coupons_$couponId_restrictions_$restrictionId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  restrictionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponRestriction.IUpdate;
}): Promise<IShoppingMallAiBackendCouponRestriction> {
  const { admin, couponId, restrictionId, body } = props;

  // Step 1: Fetch the restriction to verify it exists and is tied to the target coupon
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.findUnique(
      {
        where: { id: restrictionId },
      },
    );
  if (!existing || existing.shopping_mall_ai_backend_coupon_id !== couponId) {
    throw new Error(
      "Coupon restriction not found or does not match the target coupon.",
    );
  }

  // Step 2: Apply updates
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.update({
      where: { id: restrictionId },
      data: {
        shopping_mall_ai_backend_coupon_id:
          body.shopping_mall_ai_backend_coupon_id ?? undefined,
        shopping_mall_ai_backend_product_id:
          body.shopping_mall_ai_backend_product_id ?? undefined,
        shopping_mall_ai_backend_channel_section_id:
          body.shopping_mall_ai_backend_channel_section_id ?? undefined,
        shopping_mall_ai_backend_channel_category_id:
          body.shopping_mall_ai_backend_channel_category_id ?? undefined,
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id ?? undefined,
        start_time: body.start_time ?? undefined,
        end_time: body.end_time ?? undefined,
        weekday_bitmask: body.weekday_bitmask ?? undefined,
        is_holiday_restricted: body.is_holiday_restricted ?? undefined,
        reason_code: body.reason_code ?? undefined,
      },
    });

  // Step 3: Return to API contract/output object (mapping undefined → null if specified as such)
  return {
    id: updated.id,
    shopping_mall_ai_backend_coupon_id:
      updated.shopping_mall_ai_backend_coupon_id,
    shopping_mall_ai_backend_product_id:
      updated.shopping_mall_ai_backend_product_id ?? null,
    shopping_mall_ai_backend_channel_section_id:
      updated.shopping_mall_ai_backend_channel_section_id ?? null,
    shopping_mall_ai_backend_channel_category_id:
      updated.shopping_mall_ai_backend_channel_category_id ?? null,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id ?? null,
    start_time: updated.start_time ? toISOStringSafe(updated.start_time) : null,
    end_time: updated.end_time ? toISOStringSafe(updated.end_time) : null,
    weekday_bitmask: updated.weekday_bitmask ?? null,
    is_holiday_restricted: updated.is_holiday_restricted ?? null,
    reason_code: updated.reason_code ?? null,
    created_at: toISOStringSafe(updated.created_at),
  };
}
