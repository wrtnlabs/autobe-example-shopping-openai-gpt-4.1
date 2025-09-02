import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a specific exchange record related to an order for the
 * authenticated customer.
 *
 * This function fetches an after-sales exchange record associated with a
 * specific order and order item. It strictly verifies that the requesting
 * customer owns the order, enforcing data privacy and business rules. The
 * function returns all detailed business fields of the exchange, with all
 * datetime values formatted as `string & tags.Format<'date-time'>`, and all IDs
 * retained as originally stored in the database. Soft-deleted records
 * (deleted_at != null) are excluded. Throws descriptive errors on missing or
 * unauthorized access.
 *
 * @param props -
 *
 *   - Customer: Authenticated customer making the request
 *   - OrderId: UUID of the target order
 *   - ExchangeId: UUID of the target exchange
 *
 * @returns The IShoppingMallAiBackendOrderExchange object for this
 *   order/exchange, including reason, status, timestamps, etc.
 * @throws {Error} If the exchange does not exist or is not visible for this
 *   customer.
 * @throws {Error} If the customer does not own the order, or is otherwise
 *   unauthorized to access this exchange.
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_exchanges_$exchangeId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderExchange> {
  const { customer, orderId, exchangeId } = props;

  // Find the exchange tied to both the order and exchangeId, and not soft-deleted.
  const exchange =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findFirst({
      where: {
        id: exchangeId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!exchange) throw new Error("Order exchange not found");

  // Verify that the customer owns the order.
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: {
        id: orderId,
      },
      select: {
        shopping_mall_ai_backend_customer_id: true,
      },
    });
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this order");
  }

  // Return with all dates formatted correctly.
  return {
    id: exchange.id,
    shopping_mall_ai_backend_order_id:
      exchange.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      exchange.shopping_mall_ai_backend_order_item_id,
    exchange_reason: exchange.exchange_reason,
    status: exchange.status,
    requested_at: toISOStringSafe(exchange.requested_at),
    processed_at:
      exchange.processed_at !== null && exchange.processed_at !== undefined
        ? toISOStringSafe(exchange.processed_at)
        : null,
    completed_at:
      exchange.completed_at !== null && exchange.completed_at !== undefined
        ? toISOStringSafe(exchange.completed_at)
        : null,
    created_at: toISOStringSafe(exchange.created_at),
    updated_at: toISOStringSafe(exchange.updated_at),
    deleted_at:
      exchange.deleted_at !== null && exchange.deleted_at !== undefined
        ? toISOStringSafe(exchange.deleted_at)
        : null,
  };
}
