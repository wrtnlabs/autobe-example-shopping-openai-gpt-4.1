import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponUsage";
import { IPageIShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponUsage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search/audit of all redemptions/usages for a given coupon.
 *
 * Search, audit, or analyze coupon usage (redemption) records for a specific
 * coupon. Enables admins to filter by status, usage date range, customer, or
 * related order, with pagination. Returns detailed records suitable for
 * business, compliance, and campaign effectiveness audit.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin (authorization enforced by
 *   decorator)
 * @param props.couponId - Coupon UUID to search usages for
 * @param props.body - Filter and pagination request
 * @returns Paginated response with full coupon usage/audit details as per API
 *   schema
 * @throws {Error} If couponId has no related issuances (coupon not found)
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_usages(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponUsage.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponUsage> {
  const { couponId, body } = props;

  // Find all issuance IDs for this coupon
  const issuances =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.findMany({
      where: { shopping_mall_ai_backend_coupon_id: couponId },
      select: { id: true },
    });
  if (issuances.length === 0) {
    throw new Error("Coupon not found");
  }
  const issuanceIds: (string & tags.Format<"uuid">)[] = issuances.map(
    (i) => i.id,
  );

  // Compose where clause for usages
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    shopping_mall_ai_backend_coupon_issuance_id: { in: issuanceIds },
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.shopping_mall_ai_backend_customer_id !== undefined &&
      body.shopping_mall_ai_backend_customer_id !== null && {
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id,
      }),
    ...((body.used_at_from !== undefined && body.used_at_from !== null) ||
    (body.used_at_to !== undefined && body.used_at_to !== null)
      ? {
          used_at: {
            ...(body.used_at_from !== undefined &&
              body.used_at_from !== null && { gte: body.used_at_from }),
            ...(body.used_at_to !== undefined &&
              body.used_at_to !== null && { lte: body.used_at_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_usages.findMany({
      where,
      orderBy: { used_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_ai_backend_coupon_issuance_id: true,
        shopping_mall_ai_backend_customer_id: true,
        shopping_mall_ai_backend_order_id: true,
        used_at: true,
        amount_discounted: true,
        status: true,
        rolledback_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_usages.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_coupon_issuance_id:
        row.shopping_mall_ai_backend_coupon_issuance_id,
      shopping_mall_ai_backend_customer_id:
        row.shopping_mall_ai_backend_customer_id,
      shopping_mall_ai_backend_order_id:
        row.shopping_mall_ai_backend_order_id ?? null,
      used_at: toISOStringSafe(row.used_at),
      amount_discounted: row.amount_discounted,
      status: row.status,
      rolledback_at: row.rolledback_at
        ? toISOStringSafe(row.rolledback_at)
        : null,
    })),
  };
}
