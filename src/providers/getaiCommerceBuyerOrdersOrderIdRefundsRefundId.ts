import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detailed information for a specific refund associated with an order from
 * ai_commerce_order_refunds.
 *
 * This endpoint allows a buyer to retrieve the full detail of a specific order
 * refund record they own, by providing both the orderId and refundId. The
 * operation enforces access control so only the buyer who owns the order may
 * view its refund details.
 *
 * The function checks order ownership, retrieves the correct refund record,
 * converts all datetime values to string & tags.Format<'date-time'>, and
 * returns a strictly typed IAiCommerceOrderRefund. Unauthorized or not-found
 * conditions are explicitly managed with thrown errors. No Date type or type
 * assertion is used at any point; null and undefined are handled in line with
 * DTO expectations. The result is functional, immutable, and safe for
 * production usage.
 *
 * @param props Object containing the authenticated buyer context and refund
 *   lookup ids
 * @param props.buyer Authenticated buyer making the request (BuyerPayload)
 * @param props.orderId UUID of the order (string & tags.Format<'uuid'>)
 * @param props.refundId UUID of the refund record (string &
 *   tags.Format<'uuid'>)
 * @returns Full detail about the specified order refund in the
 *   IAiCommerceOrderRefund structure
 * @throws Error If the order does not exist, or is not owned by the buyer, or
 *   if the refund does not exist or does not belong to the specified order
 */
export async function getaiCommerceBuyerOrdersOrderIdRefundsRefundId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderRefund> {
  const { buyer, orderId, refundId } = props;

  // Verify the order exists and is owned by the current buyer
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { id: true, buyer_id: true },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error(
      "Unauthorized: You do not own this order or order does not exist.",
    );
  }

  // Fetch the refund (restrict by refund id and ensure it belongs to this order)
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findUnique({
    where: { id: refundId },
  });
  if (!refund || refund.order_id !== orderId) {
    throw new Error("Refund not found or does not belong to this order.");
  }

  // Build the response, converting all datetime values to string & tags.Format<'date-time'>
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
    resolved_at: refund.resolved_at
      ? toISOStringSafe(refund.resolved_at)
      : undefined,
  };
}
