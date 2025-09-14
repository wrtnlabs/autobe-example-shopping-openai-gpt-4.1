import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve details of a specific sub-order for an order
 * (ai_commerce_sub_orders).
 *
 * Retrieves all business and fulfillment details for a single
 * ai_commerce_sub_orders entity, under the constraint that the current buyer is
 * the owner of the parent order. All date/datetime values are strictly returned
 * as string & tags.Format<'date-time'>. Fields are mapped as per
 * IAiCommerceSubOrder, with correct handling of optional and nullable types.
 * Throws an error if the sub-order is not found, not active, or not owned by
 * the buyer.
 *
 * @param props - Object containing buyer authentication context and route
 *   parameters
 * @param props.buyer - Authenticated buyer payload
 * @param props.orderId - UUID of the parent order
 * @param props.subOrderId - UUID of the target sub-order
 * @returns IAiCommerceSubOrder with all fields populated per type contract
 * @throws {Error} If sub-order is not found, is deleted, or does not belong to
 *   the authenticated buyer
 */
export async function getaiCommerceBuyerOrdersOrderIdSubOrdersSubOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSubOrder> {
  const { buyer, orderId, subOrderId } = props;
  // Query sub-order by id, order_id, must not be soft-deleted
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
  // Query parent order for buyer ownership and soft-delete check
  const parentOrder = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!parentOrder || parentOrder.buyer_id !== buyer.id) {
    throw new Error("Not authorized to view this sub-order");
  }
  return {
    id: subOrder.id,
    order_id: subOrder.order_id,
    seller_id: subOrder.seller_id,
    suborder_code: subOrder.suborder_code,
    status: subOrder.status,
    shipping_method:
      subOrder.shipping_method !== undefined &&
      subOrder.shipping_method !== null
        ? subOrder.shipping_method
        : undefined,
    tracking_number:
      subOrder.tracking_number !== undefined &&
      subOrder.tracking_number !== null
        ? subOrder.tracking_number
        : undefined,
    total_price: subOrder.total_price,
    created_at: toISOStringSafe(subOrder.created_at),
    updated_at: toISOStringSafe(subOrder.updated_at),
    deleted_at:
      subOrder.deleted_at !== undefined && subOrder.deleted_at !== null
        ? toISOStringSafe(subOrder.deleted_at)
        : undefined,
  };
}
