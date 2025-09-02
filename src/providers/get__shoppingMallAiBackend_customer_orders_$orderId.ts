import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves detailed information for a single order belonging to the
 * authenticated customer.
 *
 * This function enforces authorization: only the order owner (customer) may
 * retrieve full order details. It provides all business fields, including
 * fulfillment, payment, status, and timeline data as permitted.
 *
 * @param props - Object containing authentication (customer) and the unique
 *   orderId to look up
 * @param props.customer - The CustomerPayload for the authenticated user (must
 *   own the order)
 * @param props.orderId - The unique UUID of the order to retrieve
 * @returns The full detail object (IShoppingMallAiBackendOrder) for the
 *   authorized order
 * @throws {Error} If order is not found or authorization fails (not owned by
 *   requester)
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrder> {
  const { customer, orderId } = props;
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        deleted_at: null,
      },
    },
  );
  if (!order) throw new Error("Order not found");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id)
    throw new Error("Unauthorized: You can only view your own orders.");
  return {
    id: order.id,
    shopping_mall_ai_backend_customer_id:
      order.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_channel_id:
      order.shopping_mall_ai_backend_channel_id,
    shopping_mall_ai_backend_seller_id:
      order.shopping_mall_ai_backend_seller_id ?? null,
    code: order.code,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    ordered_at: toISOStringSafe(order.ordered_at),
    confirmed_at: order.confirmed_at
      ? toISOStringSafe(order.confirmed_at)
      : null,
    cancelled_at: order.cancelled_at
      ? toISOStringSafe(order.cancelled_at)
      : null,
    closed_at: order.closed_at ? toISOStringSafe(order.closed_at) : null,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
  };
}
