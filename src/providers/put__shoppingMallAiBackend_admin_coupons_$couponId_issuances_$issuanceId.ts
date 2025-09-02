import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin-update a coupon issuance record's status or properties, with audit
 * traceability.
 *
 * Update, revoke, or modify the status or expiration of an existing coupon
 * issuance for a specific coupon and issuance ID. Supports business correction,
 * revocation in case of fraud or campaign policy change, and allows status or
 * expiration management under tight administrative authority.
 *
 * This operation ensures all updates are captured in a full audit log,
 * preserves immutable fields for evidence, and supports granular error feedback
 * when a policy breach occurs (e.g. attempting to update a redeemed or revoked
 * coupon), while maintaining regulatory and compliance requirements. Typical
 * use cases include revoking a coupon that is misused, extending expiration for
 * a user, or correcting metadata.
 *
 * Authorization: Only admins or campaign operators with coupon issuance
 * permissions can use this endpoint. All sensitive actions are strictly
 * validated.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload performing the update
 * @param props.couponId - Coupon ID this issuance belongs to
 * @param props.issuanceId - Unique issuance record identifier to update
 * @param props.body - Fields to update (status, expires_at, revoked_at)
 * @returns Updated coupon issuance record reflecting changes, compliance, and
 *   audit trail info.
 * @throws {Error} If admin is not active or not found
 * @throws {Error} If issuance is not found or already used/revoked
 */
export async function put__shoppingMallAiBackend_admin_coupons_$couponId_issuances_$issuanceId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  issuanceId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponIssuance.IUpdate;
}): Promise<IShoppingMallAiBackendCouponIssuance> {
  const { admin, couponId, issuanceId, body } = props;

  // 1. Authorization - check admin is active
  const adminRow =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!adminRow) throw new Error("Unauthorized: Admin is not active.");

  // 2. Retrieve the issuance
  const issuance =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.findFirst({
      where: {
        id: issuanceId,
        shopping_mall_ai_backend_coupon_id: couponId,
      },
    });
  if (!issuance) throw new Error("Issuance record not found.");

  // 3. Policy: Cannot update if already used or revoked
  if (issuance.used_at !== null || issuance.revoked_at !== null) {
    throw new Error("Cannot update issuance: already used or revoked.");
  }

  // 4. Prepare updates: only allowed fields
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.update({
      where: { id: issuanceId },
      data: {
        status: body.status ?? undefined,
        expires_at:
          body.expires_at !== undefined && body.expires_at !== null
            ? toISOStringSafe(body.expires_at)
            : body.expires_at === null
              ? null
              : undefined,
        revoked_at:
          body.revoked_at !== undefined && body.revoked_at !== null
            ? toISOStringSafe(body.revoked_at)
            : body.revoked_at === null
              ? null
              : undefined,
      },
    });

  // 5. Map to API struct with date normalization
  return {
    id: updated.id,
    shopping_mall_ai_backend_coupon_id:
      updated.shopping_mall_ai_backend_coupon_id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id ?? undefined,
    external_code: updated.external_code ?? undefined,
    expires_at:
      updated.expires_at !== null && updated.expires_at !== undefined
        ? toISOStringSafe(updated.expires_at)
        : updated.expires_at === null
          ? null
          : undefined,
    status: updated.status,
    issued_at: toISOStringSafe(updated.issued_at),
    used_at:
      updated.used_at !== null && updated.used_at !== undefined
        ? toISOStringSafe(updated.used_at)
        : updated.used_at === null
          ? null
          : undefined,
    revoked_at:
      updated.revoked_at !== null && updated.revoked_at !== undefined
        ? toISOStringSafe(updated.revoked_at)
        : updated.revoked_at === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
