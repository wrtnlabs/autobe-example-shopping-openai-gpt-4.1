import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Get details of a specific payment attempt for an order payment.
 * (shopping_mall_ai_backend_order_payment_attempts)
 *
 * Retrieve details of a specific payment attempt for a payment attached to an
 * order. This operation provides the full record including all fields stored
 * for the attempt—result state, errors, provider code, request/completion
 * timestamps. Used for compliance, audit, and support troubleshooting by
 * authorized actors. Only attempts owned by the referenced payment on the order
 * are accessible. Returns an error if not found or unauthorized.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.orderId - Order's unique identifier (UUID)
 * @param props.paymentId - Payment's unique identifier (UUID)
 * @param props.attemptId - Payment attempt's unique identifier (UUID)
 * @returns Detailed record of the payment attempt for the payment
 * @throws {Error} When order, payment, or attempt is not found, or access is
 *   denied
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_payments_$paymentId_attempts_$attemptId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  attemptId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderPaymentAttempt> {
  const { customer, orderId, paymentId, attemptId } = props;

  // Step 1: Fetch the order and confirm ownership
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    });
  if (!order) throw new Error("Order not found");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id)
    throw new Error("Unauthorized: order does not belong to customer");

  // Step 2: Fetch the payment and confirm it belongs to the order
  const payment =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findUnique({
      where: { id: paymentId },
      select: { id: true, shopping_mall_ai_backend_order_id: true },
    });
  if (!payment) throw new Error("Payment not found");
  if (payment.shopping_mall_ai_backend_order_id !== orderId)
    throw new Error("Unauthorized: payment does not belong to order");

  // Step 3: Fetch the payment attempt and confirm it belongs to the payment
  const attempt =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payment_attempts.findUnique(
      {
        where: { id: attemptId },
        select: {
          id: true,
          shopping_mall_ai_backend_order_payment_id: true,
          attempt_state: true,
          error_message: true,
          provider_code: true,
          requested_at: true,
          completed_at: true,
          created_at: true,
        },
      },
    );
  if (!attempt) throw new Error("Payment attempt not found");
  if (attempt.shopping_mall_ai_backend_order_payment_id !== paymentId)
    throw new Error("Unauthorized: payment attempt does not belong to payment");

  // Map to DTO, converting all date fields
  return {
    id: attempt.id,
    shopping_mall_ai_backend_order_payment_id:
      attempt.shopping_mall_ai_backend_order_payment_id,
    attempt_state: attempt.attempt_state,
    error_message: attempt.error_message ?? null,
    provider_code: attempt.provider_code ?? null,
    requested_at: toISOStringSafe(attempt.requested_at),
    completed_at: attempt.completed_at
      ? toISOStringSafe(attempt.completed_at)
      : null,
    created_at: toISOStringSafe(attempt.created_at),
  };
}
