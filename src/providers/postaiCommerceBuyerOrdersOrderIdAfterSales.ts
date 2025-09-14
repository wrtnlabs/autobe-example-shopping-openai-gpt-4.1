import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new after-sales case for an order (ai_commerce_order_after_sales).
 *
 * Allows an authenticated buyer (owner of the order) to submit a new
 * after-sales request (return, exchange, dispute, warranty claim) for a given
 * order. This operation validates ownership, prevents unauthorized access, and
 * initializes after-sales requests with default status, open timestamp, and
 * links to the actor. Date/time values are stringified to ISO8601 format; all
 * IDs are UUID v4.
 *
 * @param props - Request properties
 * @param props.buyer - Authenticated buyer (must own the order)
 * @param props.orderId - UUID of the order on which to create after-sales case
 * @param props.body - Payload with after-sales creation input fields (type,
 *   note, optional order_item_id)
 * @returns The created after-sales case record as persisted
 * @throws {Error} If order does not exist or does not belong to the buyer
 */
export async function postaiCommerceBuyerOrdersOrderIdAfterSales(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.ICreate;
}): Promise<IAiCommerceOrderAfterSales> {
  // Validate that the order exists and belongs to the requesting buyer
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: props.orderId,
      buyer_id: props.buyer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new Error(
      "Order not found or buyer is not authorized to perform after-sales operations on this order.",
    );
  }

  // Properly generate all fields and handle optionals/nullables per DTO
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_order_after_sales.create({
    data: {
      id: v4(),
      order_id: props.orderId,
      order_item_id: props.body.order_item_id ?? undefined,
      actor_id: props.buyer.id,
      type: props.body.type,
      status: "pending",
      opened_at: now,
      closed_at: undefined,
      note: props.body.note ?? undefined,
    },
  });

  return {
    id: created.id,
    order_id: created.order_id,
    order_item_id: created.order_item_id ?? undefined,
    actor_id: created.actor_id,
    type: created.type,
    status: created.status,
    opened_at: toISOStringSafe(created.opened_at),
    closed_at:
      created.closed_at !== null
        ? toISOStringSafe(created.closed_at)
        : undefined,
    note: created.note ?? undefined,
  };
}
