import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";
import { IPageIShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponRestriction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paged, filtered list of stacking restrictions associated with a
 * specific coupon.
 *
 * Enables administrators to search, filter, and review restrictions such as
 * excluded products, limited users, section/category limitations, effective
 * periods, and other conditional logic attached to the coupon. Filtering,
 * sorting, and pagination parameters are supported via request body. Results
 * help marketing teams and admins audit exclusions and compliance.
 *
 * @param props - Endpoint parameters
 * @param props.admin - Admin authentication payload contract
 * @param props.couponId - UUID of the coupon whose restrictions to list
 * @param props.body - Filtering, sorting, and pagination options
 *   (`IShoppingMallAiBackendCouponRestriction.IRequest`)
 * @returns Paginated list of coupon restriction summaries, per filter criteria
 * @throws {Error} When the parameters are invalid or database error occurs
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_restrictions(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponRestriction.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponRestriction.ISummary> {
  const { admin, couponId, body } = props;
  // Paging defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  const orderByField = body.orderBy ?? "created_at";
  const orderDirection = body.direction ?? "desc";

  // Build where clause
  const where = {
    deleted_at: null,
    shopping_mall_ai_backend_coupon_id: couponId,
    ...(body.product_id !== undefined &&
      body.product_id !== null && {
        shopping_mall_ai_backend_product_id: body.product_id,
      }),
    ...(body.channel_section_id !== undefined &&
      body.channel_section_id !== null && {
        shopping_mall_ai_backend_channel_section_id: body.channel_section_id,
      }),
    ...(body.channel_category_id !== undefined &&
      body.channel_category_id !== null && {
        shopping_mall_ai_backend_channel_category_id: body.channel_category_id,
      }),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_ai_backend_customer_id: body.customer_id,
      }),
    ...(body.reason_code !== undefined &&
      body.reason_code !== null && {
        reason_code: body.reason_code,
      }),
    ...(body.weekday_bitmask !== undefined &&
      body.weekday_bitmask !== null && {
        weekday_bitmask: body.weekday_bitmask,
      }),
    ...(body.is_holiday_restricted !== undefined &&
      body.is_holiday_restricted !== null && {
        is_holiday_restricted: body.is_holiday_restricted,
      }),
    ...((body.start_time_from !== undefined && body.start_time_from !== null) ||
    (body.start_time_to !== undefined && body.start_time_to !== null)
      ? {
          start_time: {
            ...(body.start_time_from !== undefined &&
              body.start_time_from !== null && {
                gte: body.start_time_from,
              }),
            ...(body.start_time_to !== undefined &&
              body.start_time_to !== null && {
                lte: body.start_time_to,
              }),
          },
        }
      : {}),
    ...((body.end_time_from !== undefined && body.end_time_from !== null) ||
    (body.end_time_to !== undefined && body.end_time_to !== null)
      ? {
          end_time: {
            ...(body.end_time_from !== undefined &&
              body.end_time_from !== null && {
                gte: body.end_time_from,
              }),
            ...(body.end_time_to !== undefined &&
              body.end_time_to !== null && {
                lte: body.end_time_to,
              }),
          },
        }
      : {}),
  };

  // FindMany and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_restrictions.count({
      where,
    }),
  ]);

  // Map to DTO, always convert Date fields properly
  const data = rows.map((r) => ({
    id: r.id,
    shopping_mall_ai_backend_coupon_id: r.shopping_mall_ai_backend_coupon_id,
    shopping_mall_ai_backend_product_id:
      r.shopping_mall_ai_backend_product_id ?? null,
    shopping_mall_ai_backend_channel_section_id:
      r.shopping_mall_ai_backend_channel_section_id ?? null,
    shopping_mall_ai_backend_channel_category_id:
      r.shopping_mall_ai_backend_channel_category_id ?? null,
    shopping_mall_ai_backend_customer_id:
      r.shopping_mall_ai_backend_customer_id ?? null,
    start_time: r.start_time ? toISOStringSafe(r.start_time) : null,
    end_time: r.end_time ? toISOStringSafe(r.end_time) : null,
    weekday_bitmask: r.weekday_bitmask ?? null,
    is_holiday_restricted: r.is_holiday_restricted ?? null,
    reason_code: r.reason_code ?? null,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
