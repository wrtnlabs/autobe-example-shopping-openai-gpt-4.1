import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft-delete an order item exchange for evidence retention and compliance.
 *
 * Marks an exchange as deleted in the system using a soft delete (sets the
 * deleted_at timestamp), preserving the full history and evidence for future
 * compliance and audit requests. Only the involved customer may execute this
 * operation, and actions are recorded in the audit trail. The exchange remains
 * in the database but is excluded from normal queries except for authorized
 * purposes.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload
 * @param props.orderId - Order ID the exchange belongs to
 * @param props.exchangeId - Target exchange ID to be deleted
 * @returns Void
 * @throws {Error} When exchange is not found, already deleted, does not belong
 *   to the order, order is not found, or the customer is unauthorized
 */
export async function delete__shoppingMallAiBackend_customer_orders_$orderId_exchanges_$exchangeId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, exchangeId } = props;

  // 1. Find the exchange; ensure it's not already soft deleted
  const exchange =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findFirst({
      where: {
        id: exchangeId,
        deleted_at: null,
      },
    });
  if (!exchange) throw new Error("Exchange not found or already deleted.");
  if (exchange.shopping_mall_ai_backend_order_id !== orderId)
    throw new Error("Exchange does not belong to order.");

  // 2. Find the order and verify ownership
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        deleted_at: null,
      },
    },
  );
  if (!order) throw new Error("Order not found.");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id)
    throw new Error("Unauthorized: You do not own this order/exchange.");

  // 3. Soft-delete the exchange
  await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.update({
    where: {
      id: exchangeId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
