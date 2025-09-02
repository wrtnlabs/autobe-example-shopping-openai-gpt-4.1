import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Get details of a specific delivery for an order.
 * (shopping_mall_ai_backend_order_deliveries)
 *
 * Retrieve detailed shipment/delivery information for a given delivery
 * associated with a specific order. The endpoint details shipping status,
 * tracking, provider, timestamps, and business context. Used by authorized
 * actors—customers, sellers, or admins—to audit delivery status, view
 * fulfillment progress, or support issue resolution. Ensures proper access
 * control and business rule compliance for shipment record access. Errors
 * include record not found, insufficient permissions, or business rule
 * violations.
 *
 * @param props - Object containing authentication and parameter fields
 * @param props.customer - Authenticated end-user information (CustomerPayload
 *   from JWT)
 * @param props.orderId - Parent order's UUID
 * @param props.deliveryId - Delivery record UUID
 * @returns Complete detailed delivery entity as DTO
 * @throws {Error} If delivery or order is not found, soft-deleted, or if
 *   customer is not authorized
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_deliveries_$deliveryId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderDelivery> {
  const { customer, orderId, deliveryId } = props;

  // 1. Fetch delivery, validate order linkage and not deleted
  const delivery =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findFirst({
      where: {
        id: deliveryId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!delivery) {
    throw new Error("Delivery not found or inaccessible.");
  }

  // 2. Check order ownership: Only the order's owning customer may access
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        shopping_mall_ai_backend_customer_id: customer.id,
      },
    },
  );
  if (!order) {
    throw new Error(
      "Forbidden: You do not have access to this order or it does not exist.",
    );
  }

  // 3. Map all fields, convert dates using toISOStringSafe, null-check optionals
  return {
    id: delivery.id,
    shopping_mall_ai_backend_order_id:
      delivery.shopping_mall_ai_backend_order_id,
    delivery_status: delivery.delivery_status,
    logistics_provider: delivery.logistics_provider ?? null,
    tracking_number: delivery.tracking_number ?? null,
    shipped_at: delivery.shipped_at
      ? toISOStringSafe(delivery.shipped_at)
      : null,
    delivered_at: delivery.delivered_at
      ? toISOStringSafe(delivery.delivered_at)
      : null,
    delivery_notes: delivery.delivery_notes ?? null,
    created_at: toISOStringSafe(delivery.created_at),
    updated_at: toISOStringSafe(delivery.updated_at),
    deleted_at: delivery.deleted_at
      ? toISOStringSafe(delivery.deleted_at)
      : null,
  };
}
