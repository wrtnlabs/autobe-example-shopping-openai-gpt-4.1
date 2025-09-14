import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing payment transaction's details/status in the
 * ai_commerce_payments table.
 *
 * This operation allows an authorized admin to retrieve (but not mutate) a
 * payment record as IAiCommercePayment, since no mutable fields exist in
 * IAiCommercePayment.IUpdate. The function enforces authorization, verifies
 * payment existence, and returns the record with all date/datetime fields
 * formatted as strings (ISO 8601, branded). No mutation is possible until
 * mutable fields are defined for IUpdate.
 *
 * @param props - Operation properties
 * @param props.admin - Authenticated admin payload (authorization enforced by
 *   decorator)
 * @param props.paymentId - The UUID of the payment record to retrieve
 * @param props.body - Currently ignored, as IAiCommercePayment.IUpdate is empty
 * @returns The current payment record, null/undefined optional fields handled
 *   per IAiCommercePayment
 * @throws {Error} If the payment transaction does not exist or is deleted
 */
export async function putaiCommerceAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IAiCommercePayment.IUpdate;
}): Promise<IAiCommercePayment> {
  const { paymentId } = props;

  const payment = await MyGlobal.prisma.ai_commerce_payments.findFirst({
    where: { id: paymentId, deleted_at: null },
  });
  if (!payment) throw new Error("Payment not found");

  return {
    id: payment.id,
    payment_reference: payment.payment_reference,
    status: payment.status,
    amount: payment.amount,
    currency_code: payment.currency_code,
    issued_at: toISOStringSafe(payment.issued_at),
    confirmed_at: payment.confirmed_at
      ? toISOStringSafe(payment.confirmed_at)
      : null,
    failure_reason:
      payment.failure_reason !== undefined ? payment.failure_reason : null,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at ? toISOStringSafe(payment.deleted_at) : null,
  };
}
