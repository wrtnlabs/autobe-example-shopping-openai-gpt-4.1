import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Performs a soft delete of an order identified by orderId
 * (shopping_mall_ai_backend_orders).
 *
 * Soft deletes an order by setting the deleted_at timestamp in the database.
 * Only the order owner (customer) can perform this action. Deletion is blocked
 * if the order is already deleted or if finalized (closed/delivered). This
 * preserves evidence for compliance.
 *
 * @param props - Object containing:
 *
 *   - Customer: authenticated customer payload (must match
 *       shopping_mall_ai_backend_orders.shopping_mall_ai_backend_customer_id)
 *   - OrderId: the UUID of the order to delete
 *
 * @returns Void
 * @throws {Error} If the order does not exist
 * @throws {Error} If the customer is not the order owner
 * @throws {Error} If the order is already deleted
 * @throws {Error} If the order is finalized, delivered, or business rules do
 *   not permit deletion
 */
export async function delete__shoppingMallAiBackend_customer_orders_$orderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId } = props;
  // 1. Fetch the order by orderId
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUniqueOrThrow({
      where: { id: orderId },
    });
  // 2. Check ownership: only owner can delete
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Unauthorized: Only the order owner can delete this order");
  }
  // 3. Business rule: block if already deleted
  if (order.deleted_at !== null) {
    throw new Error("Order is already deleted");
  }
  // 4. Block if status is finalized/closed (example: 'closed', 'delivered')
  if (order.status === "closed" || order.status === "delivered") {
    throw new Error("Cannot delete an order that is finalized or delivered");
  }
  // 5. Perform soft delete (update deleted_at)
  await MyGlobal.prisma.shopping_mall_ai_backend_orders.update({
    where: { id: orderId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
