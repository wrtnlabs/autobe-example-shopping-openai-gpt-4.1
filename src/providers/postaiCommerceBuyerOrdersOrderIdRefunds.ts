import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a refund record for a specific order in ai_commerce_order_refunds.
 *
 * This endpoint allows a buyer to create a new refund request for an order they
 * own. It checks for order ownership, prevents duplicate refund requests,
 * enforces a valid refund amount, assigns a new refund code, and sets status to
 * 'pending'. Only the buyer who placed the order may create this refund using
 * this endpoint. The generated refund record is returned with all fields as
 * defined in IAiCommerceOrderRefund. Dates and UUIDs are handled with correct
 * branding/formatting.
 *
 * @param props - The request properties
 * @param props.buyer - Authenticated buyer making the refund request
 * @param props.orderId - The order ID for which the refund is sought
 * @param props.body - Refund amount/currency/reason
 *   (IAiCommerceOrderRefund.ICreate)
 * @returns The created refund record (IAiCommerceOrderRefund)
 * @throws {Error} If the order does not exist, the buyer does not own the
 *   order, a refund already exists for this order, or the requested refund
 *   amount is invalid.
 */
export async function postaiCommerceBuyerOrdersOrderIdRefunds(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.ICreate;
}): Promise<IAiCommerceOrderRefund> {
  const { buyer, orderId, body } = props;

  // 1. Find and validate the order (must belong to buyer and not be deleted)
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new Error("Order not found or not owned by buyer");
  }

  // 2. Prevent duplicate refund for this order
  const priorRefund = await MyGlobal.prisma.ai_commerce_order_refunds.findFirst(
    {
      where: { order_id: orderId },
    },
  );
  if (priorRefund) {
    throw new Error("A refund for this order already exists.");
  }

  // 3. Validate refund amount is >0 and <= paid_amount
  if (
    !(
      typeof body.amount === "number" &&
      body.amount > 0 &&
      body.amount <= order.paid_amount
    )
  ) {
    throw new Error("Invalid refund amount");
  }

  // 4. Compose new refund record fields
  const now = toISOStringSafe(new Date());
  const newId = v4();
  const refundCode = v4();
  const createInput = {
    id: newId,
    order_id: orderId,
    actor_id: body.actor_id,
    refund_code: refundCode,
    reason: body.reason ?? null,
    status: "pending",
    amount: body.amount,
    currency: body.currency,
    requested_at: now,
    // resolved_at is not set on creation
  };

  // 5. Create refund record in DB
  const created = await MyGlobal.prisma.ai_commerce_order_refunds.create({
    data: createInput,
  });

  // 6. Build API-compliant return object (handle date/uuid/nullable fields)
  return {
    id: created.id,
    order_id: created.order_id,
    actor_id: created.actor_id,
    refund_code: created.refund_code,
    reason: created.reason ?? null,
    status: created.status,
    amount: created.amount,
    currency: created.currency,
    requested_at: toISOStringSafe(created.requested_at),
    resolved_at:
      created.resolved_at !== null && created.resolved_at !== undefined
        ? toISOStringSafe(created.resolved_at)
        : undefined,
  };
}
