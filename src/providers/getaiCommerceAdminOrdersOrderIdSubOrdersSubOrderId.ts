import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific sub-order for an order
 * (ai_commerce_sub_orders).
 *
 * This endpoint fetches all business relevant details for a single sub-order
 * identified by both the parent orderId and the subOrderId. It includes
 * fulfillment status, pricing, seller and channel context, and
 * shipping/tracking references. Only administrators may access this endpoint;
 * permissions are pre-validated. Returns an error if not found or if sub-order
 * is deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the request
 * @param props.orderId - Unique identifier of the parent order
 * @param props.subOrderId - Unique identifier of the sub-order
 * @returns IAiCommerceSubOrder with complete business status, pricing, and
 *   context
 * @throws {Error} If the sub-order is not found or deleted
 */
export async function getaiCommerceAdminOrdersOrderIdSubOrdersSubOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSubOrder> {
  const { orderId, subOrderId } = props;
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: {
      id: subOrderId,
      order_id: orderId,
      deleted_at: null,
    },
  });
  if (!subOrder) {
    throw new Error("Sub-order not found");
  }
  return {
    id: subOrder.id,
    order_id: subOrder.order_id,
    seller_id: subOrder.seller_id,
    suborder_code: subOrder.suborder_code,
    status: subOrder.status,
    shipping_method: subOrder.shipping_method ?? undefined,
    tracking_number: subOrder.tracking_number ?? undefined,
    total_price: subOrder.total_price,
    created_at: toISOStringSafe(subOrder.created_at),
    updated_at: toISOStringSafe(subOrder.updated_at),
    deleted_at: subOrder.deleted_at
      ? toISOStringSafe(subOrder.deleted_at)
      : undefined,
  };
}
