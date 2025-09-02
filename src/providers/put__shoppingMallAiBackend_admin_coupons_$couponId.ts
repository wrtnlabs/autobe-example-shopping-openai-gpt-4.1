import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update coupon configuration and business policy
 * (shopping_mall_ai_backend_coupons).
 *
 * Allows an authorized admin to update mutable attributes of a coupon policy,
 * including type, value, stacking, expiry, limits, eligibility, and
 * assignments. The update operation cannot change immutable fields (id, code,
 * created_at, etc.) and increments the updated_at timestamp for
 * versioning/audit. Coupon code, channel, and seller bindings remain unique as
 * per business and schema constraints. All business rules are enforced upstream
 * or via DB constraints.
 *
 * @param props.admin - Authenticated admin payload required for authorization.
 * @param props.couponId - Unique UUID for the coupon to update.
 * @param props.body - Fields and configuration to update (all mutable coupon
 *   properties from IShoppingMallAiBackendCoupon.IUpdate).
 * @returns The updated coupon as IShoppingMallAiBackendCoupon, with all date
 *   fields handled as string & tags.Format<'date-time'> or null.
 * @throws {Error} If coupon does not exist, is deleted, or fails
 *   database/validation constraints.
 */
export async function put__shoppingMallAiBackend_admin_coupons_$couponId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCoupon.IUpdate;
}): Promise<IShoppingMallAiBackendCoupon> {
  const { admin, couponId, body } = props;

  // Authorization enforced at controller/middleware (admin must be present)

  // 1. Ensure the coupon exists and is not soft-deleted
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: { id: couponId, deleted_at: null },
    });
  if (!found) throw new Error("Coupon not found or already deleted");

  // 2. Update only the mutable fields
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_coupons.update(
    {
      where: { id: couponId },
      data: {
        shopping_mall_ai_backend_channel_id:
          body.shopping_mall_ai_backend_channel_id ?? undefined,
        shopping_mall_ai_backend_seller_id:
          body.shopping_mall_ai_backend_seller_id ?? undefined,
        type: body.type ?? undefined,
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        value: body.value ?? undefined,
        min_order_amount: body.min_order_amount ?? undefined,
        max_discount_amount: body.max_discount_amount ?? undefined,
        currency: body.currency ?? undefined,
        expires_at: body.expires_at ?? undefined,
        stackable: body.stackable ?? undefined,
        personal: body.personal ?? undefined,
        issued_quantity: body.issued_quantity ?? undefined,
        issued_per_user: body.issued_per_user ?? undefined,
        used_per_user: body.used_per_user ?? undefined,
        usage_limit_total: body.usage_limit_total ?? undefined,
        published_at: body.published_at ?? undefined,
        status: body.status ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // 3. Return all coupon properties with all date/time fields stringified and nulls handled.
  return {
    id: updated.id,
    shopping_mall_ai_backend_channel_id:
      updated.shopping_mall_ai_backend_channel_id ?? null,
    shopping_mall_ai_backend_seller_id:
      updated.shopping_mall_ai_backend_seller_id ?? null,
    code: updated.code,
    type: updated.type,
    title: updated.title,
    description: updated.description ?? null,
    value: updated.value,
    min_order_amount: updated.min_order_amount ?? null,
    max_discount_amount: updated.max_discount_amount ?? null,
    currency: updated.currency ?? null,
    expires_at: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
    stackable: updated.stackable,
    personal: updated.personal,
    issued_quantity: updated.issued_quantity ?? null,
    issued_per_user: updated.issued_per_user ?? null,
    used_per_user: updated.used_per_user ?? null,
    usage_limit_total: updated.usage_limit_total ?? null,
    issued_count: updated.issued_count,
    used_count: updated.used_count,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
