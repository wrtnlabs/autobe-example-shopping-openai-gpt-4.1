import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get coupon details for a given couponId (shopping_mall_ai_backend_coupons).
 *
 * This API retrieves the complete details for a given coupon in the platform by
 * its unique identifier. All business-relevant fields are returned, including
 * code, type, value, stacking, issuance limits, campaign association, and the
 * current status of the coupon. The operation is intended for administrators or
 * privileged panel users managing or auditing coupon campaigns.
 *
 * Security is enforced at the endpoint to restrict access to only users with
 * admin privileges. Information about the coupon's creation, updates, and
 * logical deletion (if applicable) is included for compliance and evidence
 * tracking. The endpoint is used to support coupon validation, dispute
 * resolution, business compliance investigations, and as a foundation for
 * coupon editing or cloning operations.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.couponId - Unique UUID for the coupon to retrieve
 * @returns Detailed coupon entity record for couponId
 * @throws {Error} When the coupon does not exist or is deleted
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCoupon> {
  const { couponId } = props;
  // Find coupon that is not soft deleted
  const coupon =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: { id: couponId, deleted_at: null },
    });
  if (!coupon) throw new Error("Coupon not found");
  // Map to DTO, converting all dates, respecting nullability, never using Date type
  return {
    id: coupon.id,
    shopping_mall_ai_backend_channel_id:
      coupon.shopping_mall_ai_backend_channel_id ?? null,
    shopping_mall_ai_backend_seller_id:
      coupon.shopping_mall_ai_backend_seller_id ?? null,
    code: coupon.code,
    type: coupon.type,
    title: coupon.title,
    description: coupon.description ?? null,
    value: coupon.value,
    min_order_amount: coupon.min_order_amount ?? null,
    max_discount_amount: coupon.max_discount_amount ?? null,
    currency: coupon.currency ?? null,
    expires_at: coupon.expires_at ? toISOStringSafe(coupon.expires_at) : null,
    stackable: coupon.stackable,
    personal: coupon.personal,
    issued_quantity: coupon.issued_quantity ?? null,
    issued_per_user: coupon.issued_per_user ?? null,
    used_per_user: coupon.used_per_user ?? null,
    usage_limit_total: coupon.usage_limit_total ?? null,
    issued_count: coupon.issued_count,
    used_count: coupon.used_count,
    published_at: coupon.published_at
      ? toISOStringSafe(coupon.published_at)
      : null,
    status: coupon.status,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at: coupon.deleted_at ? toISOStringSafe(coupon.deleted_at) : null,
  };
}
