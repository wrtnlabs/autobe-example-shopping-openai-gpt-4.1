import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve detailed information of a specific order (ai_commerce_orders table)
 * by UUID
 *
 * This operation fetches the full details of a single purchase order,
 * restricted to the authenticated buyer. It ensures authorization by verifying
 * that the order belongs to the buyer and converts all dates to the proper ISO
 * format. If the order is not found or does not belong to the buyer, an error
 * is thrown.
 *
 * @param props - Request properties
 * @param props.buyer - The authenticated buyer making the request
 * @param props.orderId - The UUID of the target purchase order
 * @returns The full detail of the requested order (IAiCommerceOrder)
 * @throws {Error} When the order does not exist or does not belong to the buyer
 */
export async function getaiCommerceBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrder> {
  const { buyer, orderId } = props;

  // Fetch the order for this buyer
  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyer_id: true,
      channel_id: true,
      order_code: true,
      status: true,
      business_status: true,
      total_price: true,
      paid_amount: true,
      currency: true,
      address_snapshot_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (order == null) {
    throw new Error("Order not found");
  }
  if (order.buyer_id !== buyer.id) {
    throw new Error("Not authorized to view this order");
  }

  return {
    id: order.id,
    buyer_id: order.buyer_id,
    channel_id: order.channel_id,
    order_code: order.order_code,
    status: order.status,
    business_status: order.business_status ?? undefined,
    total_price: order.total_price,
    paid_amount: order.paid_amount,
    currency: order.currency,
    address_snapshot_id: order.address_snapshot_id,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      typeof order.deleted_at === "undefined" || order.deleted_at === null
        ? undefined
        : toISOStringSafe(order.deleted_at),
  };
}
