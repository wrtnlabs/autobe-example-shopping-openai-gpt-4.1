import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new order cancellation request (ai_commerce_order_cancellations).
 *
 * Allows an eligible actor (order buyer) to submit a new cancellation for an
 * order. Verifies order existence and ownership, prevents duplicate open
 * cancellations, and inserts the new cancellation event into the system.
 * Returns the created cancellation record.
 *
 * @param props - The operation input object.
 * @param props.buyer - Authenticated buyer payload; only order owner may
 *   submit.
 * @param props.orderId - Target order UUID.
 * @param props.body - Cancellation creation DTO (reason is required).
 * @returns Newly created cancellation record compliant with
 *   IAiCommerceOrderCancellation.
 * @throws {Error} If order does not exist, not owned by buyer, is deleted, or
 *   there is already an open cancellation.
 */
export async function postaiCommerceBuyerOrdersOrderIdCancellations(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderCancellation.ICreate;
}): Promise<IAiCommerceOrderCancellation> {
  const { buyer, orderId, body } = props;

  // Step 1: Validate order existence and ownership
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: { id: true, buyer_id: true, status: true, deleted_at: true },
  });
  if (!order || order.buyer_id !== buyer.id || order.deleted_at) {
    throw new Error("Order not found or not owned by buyer");
  }

  // Step 2: Prevent multiple open cancellations
  const openCancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
      where: {
        order_id: orderId,
        status: { notIn: ["completed", "denied"] },
      },
    });
  if (openCancellation) {
    throw new Error(
      "There is already an open cancellation request for this order",
    );
  }

  // Step 3: Generate cancellation_code
  const now = toISOStringSafe(new Date());
  const dateStr = now.slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const codeRandom = Math.random().toString(36).substring(2, 7).toUpperCase();
  const cancellation_code = "ORD-" + dateStr + "-" + codeRandom;

  // Step 4: Insert cancellation (no native Date types, all strings)
  const created = await MyGlobal.prisma.ai_commerce_order_cancellations.create({
    data: {
      id: v4(),
      order_id: orderId,
      actor_id: buyer.id,
      cancellation_code,
      reason: body.reason,
      status: body.status ?? "requested",
      requested_at: now,
      approved_at: null,
      finalized_at: null,
    },
  });

  // Step 5: Return as DTO format (no as-casting, direct mapping, nulls as specified)
  return {
    id: created.id,
    order_id: created.order_id,
    actor_id: created.actor_id,
    cancellation_code: created.cancellation_code,
    reason: created.reason ?? undefined,
    status: created.status,
    requested_at: created.requested_at,
    approved_at: created.approved_at ?? undefined,
    finalized_at: created.finalized_at ?? undefined,
  };
}
