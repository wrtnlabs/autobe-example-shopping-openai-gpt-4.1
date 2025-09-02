import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin get full details for a coupon issuance
 * (shopping_mall_ai_backend_coupon_issuances).
 *
 * Retrieve full details about a specific coupon issuance (individual issuance
 * assigned to customer, event, or channel). Used for compliance, security,
 * campaign management, or support investigation. Returns all issuance details
 * and main references to coupon and customer. Requires admin authentication.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin, required for access. Must be a
 *   valid, active administrator.
 * @param props.couponId - UUID of the parent coupon for cross-validation.
 * @param props.issuanceId - UUID of the target coupon issuance.
 * @returns IShoppingMallAiBackendCouponIssuance - Full coupon issuance details
 *   for auditing, investigation, and business/compliance flows.
 * @throws {Error} If the coupon issuance matching both couponId and issuanceId
 *   is not found, or access is not permitted.
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_issuances_$issuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponIssuance> {
  const { couponId, issuanceId } = props;

  // Fetch the coupon issuance, ensuring both issuanceId and couponId match
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.findFirst({
      where: {
        id: issuanceId,
        shopping_mall_ai_backend_coupon_id: couponId,
      },
    });
  if (!found) throw new Error("Coupon issuance not found");

  return {
    id: found.id,
    shopping_mall_ai_backend_coupon_id:
      found.shopping_mall_ai_backend_coupon_id,
    shopping_mall_ai_backend_customer_id:
      found.shopping_mall_ai_backend_customer_id ?? null,
    status: found.status,
    issued_at: toISOStringSafe(found.issued_at),
    used_at: found.used_at ? toISOStringSafe(found.used_at) : null,
    revoked_at: found.revoked_at ? toISOStringSafe(found.revoked_at) : null,
    created_at: toISOStringSafe(found.created_at),
  };
}
