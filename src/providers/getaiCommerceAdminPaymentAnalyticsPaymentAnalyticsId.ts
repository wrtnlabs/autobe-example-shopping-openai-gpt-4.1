import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePaymentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific payment analytics record by ID from
 * ai_commerce_payment_analytics table.
 *
 * This operation retrieves payment analytics details by the unique analytic
 * record ID. It operates on the ai_commerce_payment_analytics table and is
 * designed for admin-level analysis of financial flows: payment volumes,
 * refunds, coupon/mileage usage, and transaction details. Only admin users are
 * allowed access to this endpoint for business intelligence and compliance
 * queries. If the record does not exist, an error is returned.
 *
 * @param props - Properties for analytics detail retrieval
 * @param props.admin - The currently authenticated admin user (authorization
 *   context)
 * @param props.paymentAnalyticsId - The UUID of the payment analytics record to
 *   retrieve
 * @returns The full analytics record for the given ID
 * @throws {Error} If no analytics record exists for the given ID
 */
export async function getaiCommerceAdminPaymentAnalyticsPaymentAnalyticsId(props: {
  admin: AdminPayload;
  paymentAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePaymentAnalytics> {
  const { paymentAnalyticsId } = props;
  const record = await MyGlobal.prisma.ai_commerce_payment_analytics.findUnique(
    {
      where: { id: paymentAnalyticsId },
    },
  );
  if (!record) throw new Error("Payment analytics record not found");
  return {
    id: record.id,
    period_start: toISOStringSafe(record.period_start),
    period_end: toISOStringSafe(record.period_end),
    channel_id: record.channel_id,
    method_id: record.method_id,
    gateway_id: record.gateway_id,
    total_payments: record.total_payments,
    total_amount: record.total_amount,
    total_refunds: record.total_refunds,
    coupon_uses: record.coupon_uses,
    mileage_redemptions: record.mileage_redemptions,
    deposit_usages: record.deposit_usages,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
