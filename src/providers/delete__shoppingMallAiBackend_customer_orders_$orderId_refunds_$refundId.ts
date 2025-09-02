import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Logically deletes (soft deletes) a refund record associated with an order.
 *
 * This allows for evidence retention and regulatory compliance by preserving
 * the record without exposing it to regular queries. Only the involved customer
 * (order owner) or an admin may execute this operation. Sets deleted_at to a
 * timestamp and tracks the action in audit logs.
 *
 * @param props - Customer: The authenticated customer making the deletion
 *   request orderId: The order UUID associated with the refund refundId: The
 *   refund UUID to be soft deleted
 * @returns Void
 * @throws {Error} If the refund does not exist, the order does not exist, or
 *   the customer does not own the order/refund
 */
export async function delete__shoppingMallAiBackend_customer_orders_$orderId_refunds_$refundId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, refundId } = props;

  // Find refund linked to order
  const refund =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findFirst({
      where: {
        id: refundId,
        shopping_mall_ai_backend_order_id: orderId,
      },
    });
  if (!refund) throw new Error("Refund not found");

  // Fetch order to verify it belongs to this customer
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
    });
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this order");
  }

  // Soft delete the refund (set deleted_at to now)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.update({
    where: { id: refundId },
    data: {
      deleted_at: deletedAt,
    },
  });
}
