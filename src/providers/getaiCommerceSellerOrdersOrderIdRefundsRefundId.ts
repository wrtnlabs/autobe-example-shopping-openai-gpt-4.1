import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieves detailed information for a specific refund associated with the
 * given order, accessible only to sellers who own an item in that order.
 *
 * Only sellers whose SellerPayload.id appears as the seller_id of any
 * ai_commerce_order_item for that order can access the refund details. Others
 * will receive an explicit authorization error.
 *
 * Throws detailed errors if the refund does not exist, the order has no items,
 * or the seller is not eligible to view the refund.
 *
 * All date and UUID values use correct branding and no type assertions. Dates
 * are converted using toISOStringSafe to satisfy IAiCommerceOrderRefund type
 * requirements.
 *
 * @param props - Function arguments containing the seller context and path
 *   parameters
 * @param props.seller - The authenticated seller making the request
 * @param props.orderId - Unique identifier (UUID) of the parent order
 * @param props.refundId - Unique identifier (UUID) of the refund record
 * @returns IAiCommerceOrderRefund object containing detailed refund information
 * @throws {Error} If the refund or order is not found
 * @throws {Error} If the seller is not authorized to access the refund
 */
export async function getaiCommerceSellerOrdersOrderIdRefundsRefundId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderRefund> {
  const { seller, orderId, refundId } = props;

  // Step 1: Fetch the refund record for the given IDs
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findFirst({
    where: { id: refundId, order_id: orderId },
  });
  if (!refund) {
    throw new Error("Refund record not found for the given order.");
  }

  // Step 2: Fetch all order items for this order (used to check seller ownership)
  const orderItems = await MyGlobal.prisma.ai_commerce_order_items.findMany({
    where: { order_id: orderId },
    select: { seller_id: true },
  });
  if (orderItems.length === 0) {
    throw new Error("No order items found for the given order.");
  }

  // Step 3: Check if the authenticated seller owns any item in the order
  const isSellerOwner = orderItems.some((item) => item.seller_id === seller.id);
  if (!isSellerOwner) {
    throw new Error("Unauthorized: Seller has no items in this order.");
  }

  // Step 4: Return DTO-compliant refund details, converting dates appropriately
  return {
    id: refund.id,
    order_id: refund.order_id,
    actor_id: refund.actor_id,
    refund_code: refund.refund_code,
    reason: refund.reason ?? undefined,
    status: refund.status,
    amount: refund.amount,
    currency: refund.currency,
    requested_at: toISOStringSafe(refund.requested_at),
    resolved_at:
      refund.resolved_at !== undefined && refund.resolved_at !== null
        ? toISOStringSafe(refund.resolved_at)
        : undefined,
  };
}
