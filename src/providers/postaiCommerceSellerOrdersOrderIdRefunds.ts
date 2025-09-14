import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a refund record for a specific order in ai_commerce_order_refunds.
 *
 * This operation allows an authenticated seller to request a refund for an
 * order to which they are assigned, enforcing business validation on
 * seller-order assignment, refund eligibility, and paid amount limits. The
 * created refund record is appended to ai_commerce_order_refunds, with all data
 * fields and proper timestamp handling. Refund eligibility and total refund
 * amount are strictly enforced.
 *
 * @param props - Function arguments
 * @param props.seller - Payload of the authenticated seller (SellerPayload)
 * @param props.orderId - The UUID of the order being refunded
 * @param props.body - The request body per IAiCommerceOrderRefund.ICreate
 *   (amount, currency, optional reason)
 * @returns The full IAiCommerceOrderRefund object for the created refund
 * @throws {Error} If the order does not exist, is deleted, seller is not
 *   assigned to this order, or the refund is not allowed
 */
export async function postaiCommerceSellerOrdersOrderIdRefunds(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.ICreate;
}): Promise<IAiCommerceOrderRefund> {
  const { seller, orderId, body } = props;

  // Find seller by buyer_id (from auth), ensure active status
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
  });
  if (!sellerRecord) {
    throw new Error("Seller account not found or not active.");
  }

  // Locate order and check if not soft deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new Error("Order not found.");
  }

  // Find order items assignable to this seller
  const orderItems = await MyGlobal.prisma.ai_commerce_order_items.findMany({
    where: {
      order_id: orderId,
      deleted_at: null,
    },
  });
  const assigned = orderItems.some(
    (item) => item.seller_id === sellerRecord.id,
  );
  if (!assigned) {
    throw new Error("Seller is not assigned to any items in this order.");
  }

  // Calculate existing refunds (excluding denied/failed)
  const previousRefunds =
    await MyGlobal.prisma.ai_commerce_order_refunds.findMany({
      where: {
        order_id: orderId,
        status: { notIn: ["denied", "failed"] },
      },
    });
  const totalRefunded = previousRefunds.reduce((sum, r) => sum + r.amount, 0);
  const refundable = order.paid_amount - totalRefunded;
  if (body.amount > refundable) {
    throw new Error("Requested refund amount exceeds available amount.");
  }

  // Create unique refund code for audit
  const refundCode = `RFND-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Insert new refund row and return as required type
  const created = await MyGlobal.prisma.ai_commerce_order_refunds.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      actor_id: sellerRecord.id,
      refund_code: refundCode,
      reason: body.reason ?? null,
      status: "pending",
      amount: body.amount,
      currency: body.currency,
      requested_at: toISOStringSafe(new Date()),
      resolved_at: null,
    },
  });

  // Build response conforming to IAiCommerceOrderRefund DTO
  return {
    id: created.id,
    order_id: created.order_id,
    actor_id: created.actor_id,
    refund_code: created.refund_code,
    reason: created.reason ?? undefined,
    status: created.status,
    amount: created.amount,
    currency: created.currency,
    requested_at: toISOStringSafe(created.requested_at),
    resolved_at:
      created.resolved_at === null
        ? undefined
        : toISOStringSafe(created.resolved_at),
  };
}
