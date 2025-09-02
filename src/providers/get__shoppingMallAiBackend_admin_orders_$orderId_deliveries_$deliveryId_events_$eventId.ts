import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDeliveryEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * View the details of a specific delivery event in an order's shipment
 * timeline.
 *
 * Retrieve detailed information of a particular delivery event from the
 * delivery timeline of a given order. This operation is used for compliance,
 * tracking, or customer support investigations and returns the full event
 * record with metadata including event_type (status update, exception, etc),
 * event_context (description), logged_at, and creation timestamp.
 *
 * Security requires proper authorization (admin, logistic manager, or
 * designated operator). Errors include not found (invalid orderId, deliveryId,
 * or eventId), or forbidden in case of insufficient privileges. Use case
 * scenarios include logistics dispute resolution, performance audits, and
 * chain-of-custody evidencing.
 *
 * @param props - Invocation properties
 * @param props.admin - Validated admin payload, must have proper privileges
 * @param props.orderId - UUID of the order containing the delivery
 * @param props.deliveryId - UUID of the delivery being audited
 * @param props.eventId - UUID of the delivery event
 * @returns Detailed delivery event record including event type, context, and
 *   timestamps
 * @throws {Error} When event not found, not linked to delivery, delivery not
 *   found, or delivery not linked to order
 */
export async function get__shoppingMallAiBackend_admin_orders_$orderId_deliveries_$deliveryId_events_$eventId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  eventId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderDeliveryEvent> {
  const { admin, orderId, deliveryId, eventId } = props;

  // 1. Find the event by its unique identifier
  const event =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_delivery_events.findUnique(
      {
        where: { id: eventId },
      },
    );
  if (!event) throw new Error("Delivery event not found");

  // 2. Check the event belongs to the specified delivery
  if (event.shopping_mall_ai_backend_order_delivery_id !== deliveryId) {
    throw new Error("Delivery event does not belong to the specified delivery");
  }

  // 3. Fetch the delivery and check it belongs to the specified order
  const delivery =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findUnique({
      where: { id: deliveryId },
    });
  if (!delivery) throw new Error("Delivery not found");
  if (delivery.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Delivery does not belong to the specified order");
  }

  // 4. Return mapped IShoppingMallAiBackendOrderDeliveryEvent
  return {
    id: event.id,
    shopping_mall_ai_backend_order_delivery_id:
      event.shopping_mall_ai_backend_order_delivery_id,
    event_type: event.event_type,
    event_context: event.event_context,
    logged_at: toISOStringSafe(event.logged_at),
    created_at: toISOStringSafe(event.created_at),
  };
}
