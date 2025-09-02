import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new coupon and promotion policy (shopping_mall_ai_backend_coupons).
 *
 * This endpoint allows an authenticated admin to register a new coupon campaign
 * and promotion policy, ensuring code uniqueness and enforcement of core
 * business rules. All business and configuration parameters such as discount
 * value, code, type, stacking, limits, and expiry are provided via the request
 * body. The created coupon is immediately available if status is 'active' and
 * published_at is now or earlier.
 *
 * @param props - Object containing required admin authentication and body with
 *   all coupon creation parameters.
 * @param props.admin - The authenticated admin account creating the coupon
 *   (must have admin privileges).
 * @param props.body - The business and configuration fields for the coupon
 *   policy (IShoppingMallAiBackendCoupon.ICreate).
 * @returns The full IShoppingMallAiBackendCoupon DTO for the newly created
 *   record.
 * @throws {Error} If a coupon with the same code already exists for the same
 *   channel (including soft-deleted uniqueness)
 */
export async function post__shoppingMallAiBackend_admin_coupons(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCoupon.ICreate;
}): Promise<IShoppingMallAiBackendCoupon> {
  const { admin, body } = props;
  // Check uniqueness for code+channel (must include deleted_at: null)
  const conflict =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: {
        code: body.code,
        shopping_mall_ai_backend_channel_id:
          body.shopping_mall_ai_backend_channel_id ?? null,
        deleted_at: null,
      },
    });
  if (conflict) throw new Error("Coupon code already exists for this channel.");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_coupons.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_channel_id:
          body.shopping_mall_ai_backend_channel_id ?? null,
        shopping_mall_ai_backend_seller_id:
          body.shopping_mall_ai_backend_seller_id ?? null,
        code: body.code,
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        value: body.value,
        min_order_amount: body.min_order_amount ?? null,
        max_discount_amount: body.max_discount_amount ?? null,
        currency: body.currency ?? null,
        expires_at: body.expires_at ?? null,
        stackable: body.stackable,
        personal: body.personal,
        issued_quantity: body.issued_quantity ?? null,
        issued_per_user: body.issued_per_user ?? null,
        used_per_user: body.used_per_user ?? null,
        usage_limit_total: body.usage_limit_total ?? null,
        issued_count: 0 as number & tags.Type<"int32">,
        used_count: 0 as number & tags.Type<"int32">,
        published_at: body.published_at ?? null,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  return {
    id: created.id,
    shopping_mall_ai_backend_channel_id:
      created.shopping_mall_ai_backend_channel_id,
    shopping_mall_ai_backend_seller_id:
      created.shopping_mall_ai_backend_seller_id,
    code: created.code,
    type: created.type,
    title: created.title,
    description: created.description,
    value: created.value,
    min_order_amount: created.min_order_amount,
    max_discount_amount: created.max_discount_amount,
    currency: created.currency,
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    stackable: created.stackable,
    personal: created.personal,
    issued_quantity: created.issued_quantity,
    issued_per_user: created.issued_per_user,
    used_per_user: created.used_per_user,
    usage_limit_total: created.usage_limit_total,
    issued_count: created.issued_count,
    used_count: created.used_count,
    published_at: created.published_at
      ? toISOStringSafe(created.published_at)
      : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
