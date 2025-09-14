import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get a single fulfillment event (ai_commerce_order_fulfillments) for an order
 * by orderId and fulfillmentId.
 *
 * Returns the complete fulfillment event details for a specific order and
 * fulfillmentId. Verifies that the authenticated buyer owns the order, then
 * returns all shipping/delivery details, status, carrier, and contact metadata
 * for the event. Dates are returned as ISO8601 strings. Throws if the
 * fulfillment does not exist, or if the buyer is not authorized to access this
 * order.
 *
 * @param props - Request props
 * @param props.buyer - Authenticated buyer making the request (buyer payload)
 * @param props.orderId - Order ID whose fulfillment is being viewed
 * @param props.fulfillmentId - Unique ID of the fulfillment event
 * @returns The full details of the targeted fulfillment/shipping event
 * @throws {Error} If the fulfillment event does not exist or the buyer is
 *   unauthorized
 */
export async function getaiCommerceBuyerOrdersOrderIdFulfillmentsFulfillmentId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  fulfillmentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderFulfillments> {
  const { buyer, orderId, fulfillmentId } = props;

  // Step 1: Locate fulfillment event for the specified order
  const fulfillment =
    await MyGlobal.prisma.ai_commerce_order_fulfillments.findFirst({
      where: { id: fulfillmentId, order_id: orderId },
    });
  if (!fulfillment) throw new Error("Fulfillment not found");

  // Step 2: Ownership check. Order must be owned by requesting buyer.
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId },
  });
  if (!order) throw new Error("Order not found");
  if (order.buyer_id !== buyer.id)
    throw new Error("Forbidden: You do not have access to this order");

  // Step 3: Return DTO (convert DateTime fields, handle nulls for optionals)
  return {
    id: fulfillment.id,
    order_id: fulfillment.order_id,
    suborder_id: fulfillment.suborder_id ?? undefined,
    fulfillment_code: fulfillment.fulfillment_code,
    status: fulfillment.status,
    carrier: fulfillment.carrier,
    carrier_contact: fulfillment.carrier_contact ?? undefined,
    fulfilled_at: toISOStringSafe(fulfillment.fulfilled_at),
    updated_at: toISOStringSafe(fulfillment.updated_at),
  };
}
