import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves full details of a specific coupon restriction associated with a
 * coupon, including type, applicability, enforcement logic, and business
 * context of restriction.
 *
 * This operation is integral for reviewing and auditing restrictions that limit
 * or block a coupon's use for certain users, products, categories, timeframes,
 * or business purposes.
 *
 * Business rules ensure the restriction is requested in the scope of the
 * correct coupon, and the combination is valid. The data is especially valuable
 * when supporting compliance checks, troubleshooting customer complaints about
 * coupon ineligibility, and conducting policy reviews. All access should be
 * restricted to authorized business managers or admins.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (authorization already
 *   enforced)
 * @param props.couponId - Unique identifier of the coupon this restriction
 *   belongs to
 * @param props.restrictionId - Unique identifier of the restriction to retrieve
 * @returns The coupon restriction object in full detail, with all business
 *   attributes and timestamps in API contract types
 * @throws {Error} If the restriction is not found, or does not belong to the
 *   specified coupon
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_restrictions_$restrictionId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  restrictionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponRestriction> {
  const { couponId, restrictionId } = props;
  // Fetch restriction by unique id
  const restriction =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.findUnique(
      {
        where: { id: restrictionId },
      },
    );
  // Validate existence and coupon linkage
  if (
    !restriction ||
    restriction.shopping_mall_ai_backend_coupon_id !== couponId
  ) {
    throw new Error("Restriction not found or not linked to the given coupon.");
  }
  // Return with proper type/branding and date conversion where necessary (null-guarded)
  return {
    id: restriction.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_coupon_id:
      restriction.shopping_mall_ai_backend_coupon_id as string &
        tags.Format<"uuid">,
    shopping_mall_ai_backend_product_id:
      restriction.shopping_mall_ai_backend_product_id ?? null,
    shopping_mall_ai_backend_channel_section_id:
      restriction.shopping_mall_ai_backend_channel_section_id ?? null,
    shopping_mall_ai_backend_channel_category_id:
      restriction.shopping_mall_ai_backend_channel_category_id ?? null,
    shopping_mall_ai_backend_customer_id:
      restriction.shopping_mall_ai_backend_customer_id ?? null,
    start_time: restriction.start_time
      ? toISOStringSafe(restriction.start_time)
      : null,
    end_time: restriction.end_time
      ? toISOStringSafe(restriction.end_time)
      : null,
    weekday_bitmask: restriction.weekday_bitmask ?? null,
    is_holiday_restricted: restriction.is_holiday_restricted ?? null,
    reason_code: restriction.reason_code ?? null,
    created_at: toISOStringSafe(restriction.created_at),
  };
}
