import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details on a single order (ai_commerce_orders) by orderId
 *
 * Retrieves detailed information about a specific order, identified by orderId,
 * from the ai_commerce_orders table. This function is restricted to admin use,
 * ensuring secure access to potentially sensitive order and user information.
 * It performs strict type and field mapping in alignment with the
 * IAiCommerceOrder DTO.
 *
 * @param props - The properties for this operation
 * @param props.admin - Authenticated admin payload
 * @param props.orderId - The unique identifier (UUID) of the order
 * @returns Full details of the specified order as IAiCommerceOrder
 * @throws {Error} If the order does not exist, is soft-deleted, or is
 *   inaccessible
 */
export async function getaiCommerceAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrder> {
  const { orderId } = props;

  const order = await MyGlobal.prisma.ai_commerce_orders.findUnique({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new Error("Order not found");
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
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };
}
