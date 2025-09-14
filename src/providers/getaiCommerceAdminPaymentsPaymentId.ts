import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full detail for a specific payment event from the
 * ai_commerce_payments table.
 *
 * This endpoint returns the detailed record for a specified payment, as managed
 * by the ai_commerce_payments schema model. The retrieved information includes
 * payment status, reference code, amount, issued and confirmation times, any
 * failure reason, and related order or user linkage.
 *
 * This operation supports compliance with financial reporting, helps admin
 * review payment settlement status, troubleshoot failed transactions, or
 * provide resolution for refunds and disputes. Data access is limited to
 * authorized administrative users and may be used synergistically with payment
 * audit, refund, or order management endpoints for deeper financial operations
 * and system integrity.
 *
 * @param props - Object containing admin payload and paymentId
 * @param props.admin - The authenticated admin user making the request
 * @param props.paymentId - Identifier of the payment record to retrieve
 * @returns All details stored for the requested payment transaction, as per the
 *   payments table, including status, timestamps, and failure information.
 * @throws {Error} If payment record is not found (does not exist or deleted)
 */
export async function getaiCommerceAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IAiCommercePayment> {
  const { paymentId } = props;
  const payment = await MyGlobal.prisma.ai_commerce_payments.findFirst({
    where: { id: paymentId, deleted_at: null },
    select: {
      id: true,
      payment_reference: true,
      status: true,
      amount: true,
      currency_code: true,
      issued_at: true,
      confirmed_at: true,
      failure_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!payment) {
    throw new Error("Payment record not found.");
  }
  return {
    id: payment.id,
    payment_reference: payment.payment_reference,
    status: payment.status,
    amount: payment.amount,
    currency_code: payment.currency_code,
    issued_at: toISOStringSafe(payment.issued_at),
    confirmed_at: payment.confirmed_at
      ? toISOStringSafe(payment.confirmed_at)
      : undefined,
    failure_reason: payment.failure_reason ?? undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at
      ? toISOStringSafe(payment.deleted_at)
      : undefined,
  };
}
