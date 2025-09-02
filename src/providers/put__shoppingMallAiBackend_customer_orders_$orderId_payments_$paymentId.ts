import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a payment for a specific order.
 * (shopping_mall_ai_backend_order_payments)
 *
 * This operation updates an existing payment record for a specific order,
 * allowing changes to payment method, status, amount, or external provider data
 * prior to completion/settlement. Modifications are only permitted for statuses
 * such as 'pending' or 'failed'. Enforces strict business rules to ensure
 * regulatory compliance, owner-only update, and integrity of payment state.
 * Once a payment is completed, cancelled, or soft-deleted, further updates are
 * forbidden. All date and datetime fields are handled as ISO 8601 strings. No
 * native Date type is used.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.orderId - The target order's UUID
 * @param props.paymentId - The target payment's UUID
 * @param props.body - The update data for the payment (method, amount, status,
 *   etc)
 * @returns Updated payment details (IShoppingMallAiBackendOrderPayment)
 * @throws {Error} When payment not found, deleted, locked
 *   (completed/cancelled), or not owned by customer
 */
export async function put__shoppingMallAiBackend_customer_orders_$orderId_payments_$paymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderPayment.IUpdate;
}): Promise<IShoppingMallAiBackendOrderPayment> {
  const { customer, orderId, paymentId, body } = props;

  // Load payment ensuring it's not soft deleted and matches the order
  const payment =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findFirst({
      where: {
        id: paymentId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!payment) throw new Error("Payment not found or already deleted");

  // Verify ownership via the order
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { shopping_mall_ai_backend_customer_id: true },
    });
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Unauthorized: you do not own this order/payment");
  }

  // Only allow update if payment is pending or failed
  if (payment.status !== "pending" && payment.status !== "failed") {
    throw new Error("Payment is locked and cannot be updated");
  }

  // Inline update only with provided fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.update({
      where: { id: paymentId },
      data: {
        payment_method: body.payment_method ?? undefined,
        amount: body.amount ?? undefined,
        currency: body.currency ?? undefined,
        status: body.status ?? undefined,
        external_reference: body.external_reference ?? undefined,
        completed_at: body.completed_at ?? undefined,
        failed_at: body.failed_at ?? undefined,
        cancelled_at: body.cancelled_at ?? undefined,
        updated_at: now,
      },
    });

  // Assemble strictly-typed result
  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    payment_method: updated.payment_method,
    amount: updated.amount,
    currency: updated.currency,
    status: updated.status,
    external_reference:
      typeof updated.external_reference === "string"
        ? updated.external_reference
        : null,
    requested_at: toISOStringSafe(updated.requested_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    failed_at: updated.failed_at ? toISOStringSafe(updated.failed_at) : null,
    cancelled_at: updated.cancelled_at
      ? toISOStringSafe(updated.cancelled_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
