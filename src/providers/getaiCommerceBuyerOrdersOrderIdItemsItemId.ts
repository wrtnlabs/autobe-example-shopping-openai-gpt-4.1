import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve the full details of a specific order item within a buyer order.
 *
 * This endpoint allows an authenticated buyer to fetch the details of a single
 * order item, strictly enforcing ownership by checking the provided orderId is
 * present and belongs to the buyer. Only buyers who own the parent order may
 * access the corresponding order items. All date and time values are returned
 * as ISO8601 strings.
 *
 * @param props - Input parameter object
 * @param props.buyer - The authenticated buyer (BuyerPayload) making the
 *   request
 * @param props.orderId - The UUID of the parent order
 * @param props.itemId - The UUID of the target order item
 * @returns IAiCommerceOrderItem containing all order item details
 * @throws {Error} If the order does not exist, does not belong to the buyer, or
 *   the order item is not found within this order
 */
export async function getaiCommerceBuyerOrdersOrderIdItemsItemId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderItem> {
  const { buyer, orderId, itemId } = props;

  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error(
      "Unauthorized: buyer does not own order or order not found",
    );
  }

  const item = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: itemId,
      order_id: orderId,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new Error("Order item not found");
  }

  return {
    id: item.id,
    order_id: item.order_id,
    product_variant_id: item.product_variant_id,
    seller_id: item.seller_id === null ? undefined : item.seller_id,
    item_code: item.item_code,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    delivery_status: item.delivery_status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
  };
}
