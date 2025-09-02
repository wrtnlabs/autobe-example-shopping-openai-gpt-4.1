import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new restriction entry under a given coupon, specifying business
 * limitations such as blocked product, excluded user, category restriction,
 * date/time restriction, or business scenario limits.
 *
 * This operation validates that the restriction does not duplicate an existing
 * active rule for the target coupon, and that all key parameters (type, scope,
 * period, reason) are provided and valid. It is strictly limited to
 * administrators or managers with requisite permissions. Change tracking and
 * audit are automatically enforced because coupon restrictions directly impact
 * eligibility and customer experience.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the operation
 * @param props.couponId - UUID of the coupon on which to create the restriction
 * @param props.body - Restriction specification to apply to the given coupon
 * @returns The newly created coupon restriction entry
 * @throws {Error} If a duplicate restriction with the same parameters already
 *   exists for this coupon
 */
export async function post__shoppingMallAiBackend_admin_coupons_$couponId_restrictions(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponRestriction.ICreate;
}): Promise<IShoppingMallAiBackendCouponRestriction> {
  const { admin, couponId, body } = props;
  // Check for existence of duplicate restriction (ignoring deleted ones only if typing allows; by default just unique business keys)
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.findFirst(
      {
        where: {
          shopping_mall_ai_backend_coupon_id: couponId,
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
      },
    );
  if (exists)
    throw new Error(
      "A restriction with the same scope and parameters already exists for this coupon.",
    );

  // Create the coupon restriction entry
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_coupon_id: couponId,
        shopping_mall_ai_backend_product_id:
          body.shopping_mall_ai_backend_product_id ?? null,
        shopping_mall_ai_backend_channel_section_id:
          body.shopping_mall_ai_backend_channel_section_id ?? null,
        shopping_mall_ai_backend_channel_category_id:
          body.shopping_mall_ai_backend_channel_category_id ?? null,
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id ?? null,
        start_time: body.start_time ? toISOStringSafe(body.start_time) : null,
        end_time: body.end_time ? toISOStringSafe(body.end_time) : null,
        weekday_bitmask: body.weekday_bitmask ?? null,
        is_holiday_restricted: body.is_holiday_restricted ?? null,
        reason_code: body.reason_code ?? null,
        created_at: now,
      },
    });
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_coupon_id:
      created.shopping_mall_ai_backend_coupon_id as string &
        tags.Format<"uuid">,
    shopping_mall_ai_backend_product_id:
      created.shopping_mall_ai_backend_product_id ?? null,
    shopping_mall_ai_backend_channel_section_id:
      created.shopping_mall_ai_backend_channel_section_id ?? null,
    shopping_mall_ai_backend_channel_category_id:
      created.shopping_mall_ai_backend_channel_category_id ?? null,
    shopping_mall_ai_backend_customer_id:
      created.shopping_mall_ai_backend_customer_id ?? null,
    start_time: created.start_time ? toISOStringSafe(created.start_time) : null,
    end_time: created.end_time ? toISOStringSafe(created.end_time) : null,
    weekday_bitmask: created.weekday_bitmask ?? null,
    is_holiday_restricted: created.is_holiday_restricted ?? null,
    reason_code: created.reason_code ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
