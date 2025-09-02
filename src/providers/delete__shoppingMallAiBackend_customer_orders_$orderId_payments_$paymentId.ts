import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft delete (audit-compliant) a payment record for a specific customer order.
 *
 * This function performs a soft deletion of the specified payment record,
 * enforcing authorization (order ownership), strict business policy (cannot
 * delete completed/locked payments), and database contract (deleted_at for soft
 * delete).
 *
 * Only payments in a non-settled (non-completed, non-locked) state can be
 * soft-deleted. Unauthorized access or violations of business rules will raise
 * errors. Deletion is preserved for audit/compliance via a deleted_at ISO
 * timestamp.
 *
 * @param props - Parameters for the operation
 * @param props.customer - Authenticated customer payload performing the request
 * @param props.orderId - UUID of the order containing the payment
 * @param props.paymentId - UUID of the payment to be (soft) deleted
 * @returns Void (on successful deletion)
 * @throws {Error} If payment record not found, already deleted, not owned by
 *   customer, or if payment is completed/locked
 */
export async function delete__shoppingMallAiBackend_customer_orders_$orderId_payments_$paymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, paymentId } = props;

  // 1. Fetch payment
  const payment =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findFirst({
      where: {
        id: paymentId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!payment) {
    throw new Error(
      "Payment does not exist for this order or is already deleted",
    );
  }

  // 2. Fetch order (for ownership check)
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
      },
    },
  );
  if (!order) {
    throw new Error("Order does not exist");
  }

  // 3. Enforce customer ownership
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this order");
  }

  // 4. Status-based soft delete permission
  // Disallow: succeeded, paid, refunded, completed (business-locked states)
  if (["succeeded", "paid", "refunded", "completed"].includes(payment.status)) {
    throw new Error(
      "Cannot delete payment that is completed, settled, or locked by business rules",
    );
  }

  // 5. Perform soft deletion by marking deleted_at
  await MyGlobal.prisma.shopping_mall_ai_backend_order_payments.update({
    where: { id: paymentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  return;
}
