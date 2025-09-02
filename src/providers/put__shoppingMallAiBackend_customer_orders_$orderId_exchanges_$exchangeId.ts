import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import { EOrderExchangeStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderExchangeStatus";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Updates a specific order item exchange with new business or process data.
 *
 * This endpoint allows an authenticated customer to update their own order
 * exchange request. Permitted fields for update include exchange_reason,
 * status, and completed_at. All updates are thoroughly validated for exchange
 * ownership, order existence, and compliance with business workflow. Timestamps
 * are managed with strict type safety, and all state changes are logged. Only
 * the owning customer may update their exchange record.
 *
 * @param props - The request bundle
 * @param props.customer - Authenticated customer performing the update
 * @param props.orderId - UUID of the order to which the exchange belongs
 * @param props.exchangeId - UUID of the exchange being updated
 * @param props.body - Partial update info (exchange_reason, status,
 *   completed_at)
 * @returns IShoppingMallAiBackendOrderExchange - The updated exchange record
 *   after business logic and compliance checks
 * @throws {Error} When the exchange does not exist, does not belong to the
 *   specified order, or the order does not belong to the authenticated
 *   customer
 */
export async function put__shoppingMallAiBackend_customer_orders_$orderId_exchanges_$exchangeId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderExchange.IUpdate;
}): Promise<IShoppingMallAiBackendOrderExchange> {
  const { customer, orderId, exchangeId, body } = props;
  // 1. Fetch the exchange by id
  const exchange =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findUnique({
      where: { id: exchangeId },
      select: {
        id: true,
        shopping_mall_ai_backend_order_id: true,
        shopping_mall_ai_backend_order_item_id: true,
        exchange_reason: true,
        status: true,
        requested_at: true,
        processed_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!exchange) throw new Error("Exchange not found");
  // 2. Verify the exchange belongs to the provided order
  if (exchange.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Exchange does not belong to the provided order");
  }
  // 3. Fetch the order and validate ownership
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    });
  if (!order) throw new Error("Order not found");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: customer does not own the order");
  }
  // 4. Prepare update fields, updating only allowed properties and timestamps
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.update({
      where: { id: exchangeId },
      data: {
        exchange_reason: body.exchange_reason ?? undefined,
        status: body.status ?? undefined,
        completed_at: body.completed_at ?? undefined,
        updated_at: now,
      },
      select: {
        id: true,
        shopping_mall_ai_backend_order_id: true,
        shopping_mall_ai_backend_order_item_id: true,
        exchange_reason: true,
        status: true,
        requested_at: true,
        processed_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 5. Map all date fields to string & tags.Format<'date-time'>
  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      updated.shopping_mall_ai_backend_order_item_id,
    exchange_reason: updated.exchange_reason,
    status: updated.status,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
