import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Fetch in-depth business/payment details for a specific payment within a
 * customer's order.
 *
 * This endpoint retrieves all operational/payment/audit fields for a payment
 * record, including payment method, amount, status, external references, and
 * all relevant timestamps. Strict permission: only the customer who owns the
 * order can access the payment details. Throws if payment is missing or
 * customer is not the order owner.
 *
 * @param props.customer - The authenticated customer payload making the request
 * @param props.orderId - Order ID (UUID) to which the payment belongs
 * @param props.paymentId - Payment record ID (UUID) being retrieved
 * @returns Full detail of the payment record for business/operational/audit
 *   purposes
 * @throws {Error} If payment not found, or order not found, or customer does
 *   not own order
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_payments_$paymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderPayment> {
  // Step 1: Fetch payment record
  const payment =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findFirst({
      where: {
        id: props.paymentId,
        shopping_mall_ai_backend_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (!payment) {
    throw new Error("Payment not found");
  }

  // Step 2: Fetch order and check customer ownership
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: props.orderId,
        deleted_at: null,
      },
    },
  );
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.shopping_mall_ai_backend_customer_id !== props.customer.id) {
    throw new Error(
      "Forbidden: You do not have access to this order's payment details",
    );
  }

  return {
    id: payment.id,
    shopping_mall_ai_backend_order_id:
      payment.shopping_mall_ai_backend_order_id,
    payment_method: payment.payment_method,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    external_reference: payment.external_reference ?? null,
    requested_at: toISOStringSafe(payment.requested_at),
    completed_at: payment.completed_at
      ? toISOStringSafe(payment.completed_at)
      : null,
    failed_at: payment.failed_at ? toISOStringSafe(payment.failed_at) : null,
    cancelled_at: payment.cancelled_at
      ? toISOStringSafe(payment.cancelled_at)
      : null,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at ? toISOStringSafe(payment.deleted_at) : null,
  };
}
