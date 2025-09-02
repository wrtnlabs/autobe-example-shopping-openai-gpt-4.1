import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderExchange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderExchange";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information for a specific after-sales exchange record
 * belonging to an order.
 *
 * This endpoint allows an authenticated admin to fetch the details of a
 * particular order item exchange, including business workflow, audit
 * information, and timestamps. It is essential for compliance, business review,
 * and customer service operation for after-sales exchange workflows. Returns
 * all core exchange fields required for audit and progress display.
 *
 * @param props - Required properties for the operation
 * @param props.admin - Authenticated administrator's payload
 * @param props.orderId - Unique identifier for the order (UUID)
 * @param props.exchangeId - Unique identifier for the exchange record (UUID)
 * @returns IShoppingMallAiBackendOrderExchange - Exchange record containing
 *   status, timestamps, and business context
 * @throws {Error} If the exchange record is not found or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_orders_$orderId_exchanges_$exchangeId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderExchange> {
  const { admin, orderId, exchangeId } = props;
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findFirst({
      where: {
        id: exchangeId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!found) {
    throw new Error("Exchange not found");
  }
  return {
    id: found.id,
    shopping_mall_ai_backend_order_id: found.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      found.shopping_mall_ai_backend_order_item_id,
    exchange_reason: found.exchange_reason,
    status: found.status,
    requested_at: toISOStringSafe(found.requested_at),
    processed_at: found.processed_at
      ? toISOStringSafe(found.processed_at)
      : null,
    completed_at: found.completed_at
      ? toISOStringSafe(found.completed_at)
      : null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
