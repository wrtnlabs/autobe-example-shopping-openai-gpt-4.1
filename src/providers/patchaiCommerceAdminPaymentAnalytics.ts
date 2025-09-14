import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentAnalytics";
import { IPageIAiCommercePaymentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated summary analytics of payment/coupon/mileage transactional
 * activity from ai_commerce_payment_analytics.
 *
 * This endpoint retrieves a paginated and filtered set of payment analytics
 * summary records from ai_commerce_payment_analytics, supporting query by
 * period, channel, payment method, or gateway. Results support business
 * dashboards and compliance reporting, and are only accessible by authorized
 * admins.
 *
 * @param props - Request properties containing:
 *
 *   - Admin: Authenticated admin making this request
 *   - Body: Filters and pagination for the analytics query
 *
 * @returns Paginated set of analytics records with summary KPIs
 * @throws {Error} If database operations fail
 */
export async function patchaiCommerceAdminPaymentAnalytics(props: {
  admin: AdminPayload;
  body: IAiCommercePaymentAnalytics.IRequest;
}): Promise<IPageIAiCommercePaymentAnalytics> {
  const { body } = props;
  // Defaults and normalization
  const rawPage =
    typeof body.page === "number" && Number.isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const rawLimit =
    typeof body.limit === "number" &&
    Number.isFinite(body.limit) &&
    body.limit > 0
      ? body.limit
      : 50;
  const page = Number(rawPage);
  const limit = Number(rawLimit);

  // Always skip both undefined and null for any filter
  const where = {
    ...(body.period_start !== undefined &&
      body.period_start !== null && {
        period_start: { gte: body.period_start },
      }),
    ...(body.period_end !== undefined &&
      body.period_end !== null && {
        period_end: { lte: body.period_end },
      }),
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && {
        channel_id: body.channel_id,
      }),
    ...(body.method_id !== undefined &&
      body.method_id !== null && {
        method_id: body.method_id,
      }),
    ...(body.gateway_id !== undefined &&
      body.gateway_id !== null && {
        gateway_id: body.gateway_id,
      }),
  };

  // Query rows and count concurrently, with correct paging and sort
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_payment_analytics.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_payment_analytics.count({ where }),
  ]);

  // Map each row, normalize all date fields with toISOStringSafe
  const data = rows.map((row) => {
    return {
      id: row.id,
      period_start: toISOStringSafe(row.period_start),
      period_end: toISOStringSafe(row.period_end),
      channel_id: row.channel_id,
      method_id: row.method_id,
      gateway_id: row.gateway_id,
      total_payments: row.total_payments,
      total_amount: row.total_amount,
      total_refunds: row.total_refunds,
      coupon_uses: row.coupon_uses,
      mileage_redemptions: row.mileage_redemptions,
      deposit_usages: row.deposit_usages,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  // Pagination info, stripped branding with Number() for compatibility
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
