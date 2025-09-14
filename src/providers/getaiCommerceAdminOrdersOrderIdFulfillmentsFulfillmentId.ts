import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a single fulfillment event (ai_commerce_order_fulfillments) for an order
 * by orderId and fulfillmentId.
 *
 * Returns complete details for a fulfillment action on a specific order,
 * selecting by orderId and fulfillmentId. Queries
 * ai_commerce_order_fulfillments for all relevant attributes, such as carrier,
 * delivery status, carrier contact, and event times. Designed for tracking,
 * support, and regulatory audit scenarios.
 *
 * Access is limited to the buyer who owns the order, the seller responsible for
 * the sub-order being fulfilled, or an administrator. This implementation is
 * for admin access.
 *
 * @param props - The function parameters
 * @param props.admin - The authenticated administrator user context
 * @param props.orderId - Order ID (ai_commerce_orders.id) whose fulfillment is
 *   being viewed
 * @param props.fulfillmentId - Unique ID of the fulfillment event
 *   (ai_commerce_order_fulfillments.id)
 * @returns Full details of the targeted fulfillment/shipping event
 * @throws {Error} If no matching fulfillment exists for the given orderId and
 *   fulfillmentId
 */
export async function getaiCommerceAdminOrdersOrderIdFulfillmentsFulfillmentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  fulfillmentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderFulfillments> {
  const { orderId, fulfillmentId } = props;
  const row =
    await MyGlobal.prisma.ai_commerce_order_fulfillments.findFirstOrThrow({
      where: {
        id: fulfillmentId,
        order_id: orderId,
      },
    });
  return {
    id: row.id,
    order_id: row.order_id,
    suborder_id: row.suborder_id ?? undefined,
    fulfillment_code: row.fulfillment_code,
    status: row.status,
    carrier: row.carrier,
    carrier_contact: row.carrier_contact ?? undefined,
    fulfilled_at: toISOStringSafe(row.fulfilled_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
