import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderFulfillments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderFulfillments";
import { SellerPayload } from "../decorators/payload/SellerPayload";

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
 * Access is limited to the seller responsible for the sub-order being
 * fulfilled. Helps users trace parcel and delivery state, resolve issues, and
 * support compliance. If the fulfillmentId does not exist for the order, or the
 * seller is unauthorized, an error is returned. Complements the list/search
 * endpoint for order fulfillments.
 *
 * @param props - Seller payload, orderId (ai_commerce_orders.id), fulfillmentId
 * @param props.seller - Authenticated seller payload
 * @param props.orderId - The parent order's UUID
 * @param props.fulfillmentId - The fulfillment event UUID
 * @returns Complete fulfillment event details
 * @throws {Error} If fulfillment does not exist or user unauthorized
 */
export async function getaiCommerceSellerOrdersOrderIdFulfillmentsFulfillmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  fulfillmentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderFulfillments> {
  const { seller, orderId, fulfillmentId } = props;

  // Find the fulfillment by id and order, strictly match
  const fulfillment =
    await MyGlobal.prisma.ai_commerce_order_fulfillments.findFirst({
      where: {
        id: fulfillmentId,
        order_id: orderId,
      },
    });
  if (!fulfillment) throw new Error("Fulfillment not found");

  // Authorization: Seller can only access fulfillment if linked suborder belongs to them
  if (fulfillment.suborder_id) {
    const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findUnique({
      where: { id: fulfillment.suborder_id },
    });
    if (!subOrder || subOrder.seller_id !== seller.id) {
      throw new Error("Unauthorized to view this fulfillment");
    }
  } else {
    // No suborder means no seller linkage - access denied
    throw new Error("Unauthorized to view this fulfillment");
  }

  // Map to DTO with brand-correct types, never use Date type
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
