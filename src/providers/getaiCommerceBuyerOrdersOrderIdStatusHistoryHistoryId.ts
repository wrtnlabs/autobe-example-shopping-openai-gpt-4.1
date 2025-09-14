import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get a single order status history event (ai_commerce_order_status_history) by
 * orderId and historyId.
 *
 * This operation retrieves a specific status change record for the given order
 * as identified by orderId and historyId. The authenticated buyer must be the
 * owner of the order. Returns all details of the status event, including the
 * actor, change time, old and new status, workflow states, and note if present.
 * Throws an error if the record does not exist or the user is not authorized to
 * view it.
 *
 * @param props - Object containing:
 *
 *   - Buyer: BuyerPayload
 *   - OrderId: string (order's UUID)
 *   - HistoryId: string (UUID of status history event)
 *
 * @returns The IAiCommerceOrderStatusHistory record for the specified order and
 *   status event
 * @throws {Error} When the status history or order does not exist or user is
 *   not authorized
 */
export async function getaiCommerceBuyerOrdersOrderIdStatusHistoryHistoryId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderStatusHistory> {
  const { buyer, orderId, historyId } = props;

  // Retrieve the status history record for given orderId & historyId
  const record =
    await MyGlobal.prisma.ai_commerce_order_status_history.findFirst({
      where: {
        id: historyId,
        order_id: orderId,
      },
    });
  if (!record) {
    throw new Error("Status history not found");
  }

  // Ensure the requesting buyer owns the order
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId },
    select: { buyer_id: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.buyer_id !== buyer.id) {
    throw new Error("Unauthorized: You do not own this order");
  }

  return {
    id: record.id,
    order_id: record.order_id,
    actor_id: record.actor_id,
    old_status: record.old_status,
    new_status: record.new_status,
    old_business_status: record.old_business_status ?? undefined,
    new_business_status: record.new_business_status ?? undefined,
    note: record.note ?? undefined,
    changed_at: toISOStringSafe(record.changed_at),
  };
}
