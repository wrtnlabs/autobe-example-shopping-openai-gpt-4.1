import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponCode";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full details about a specific bulk/event coupon code for a given
 * coupon and code ID.
 *
 * Used for audit, fraud investigation, or campaign management. Returns all code
 * attributes, history, and status, linking code to issuance and campaign where
 * possible. Only available to authorized compliance/business roles. Uses
 * shopping_mall_ai_backend_coupon_codes as the primary model, and ensures no
 * direct code modification is allowed via this endpoint. All returned data is
 * evidence-grade for audit and legal compliance.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin requesting the code detail.
 *   Authorization enforced; only admins have access.
 * @param props.couponId - The coupon ID (context) to which the code must belong
 *   (strict scoping, ensures correct traceability/audit).
 * @param props.codeId - The code ID (primary key; must be linked to the coupon
 *   above, not just any code).
 * @returns Audit-grade coupon code details including status, issuance linkage,
 *   timestamps, and all evidence data required for business, compliance, or
 *   regulatory review.
 * @throws {Error} If the coupon code does not exist, or does not belong to the
 *   specified coupon.
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_codes_$codeId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  codeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponCode> {
  const { admin, couponId, codeId } = props;

  // Enforce business/auth context: admin privilege is required
  // Query by joint key: id (code) + coupon context. This prevents leakage across campaigns.
  const code =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_codes.findFirst({
      where: {
        id: codeId,
        shopping_mall_ai_backend_coupon_id: couponId,
      },
    });
  if (!code)
    throw new Error(
      "Coupon code not found or does not belong to specified coupon.",
    );

  return {
    id: code.id,
    shopping_mall_ai_backend_coupon_id: code.shopping_mall_ai_backend_coupon_id,
    shopping_mall_ai_backend_coupon_issuance_id:
      code.shopping_mall_ai_backend_coupon_issuance_id ?? null,
    bulk_code: code.bulk_code,
    issued_to_email: code.issued_to_email ?? null,
    status: code.status,
    created_at: toISOStringSafe(code.created_at),
    redeemed_at:
      code.redeemed_at != null ? toISOStringSafe(code.redeemed_at) : null,
    revoked_at:
      code.revoked_at != null ? toISOStringSafe(code.revoked_at) : null,
  };
}
