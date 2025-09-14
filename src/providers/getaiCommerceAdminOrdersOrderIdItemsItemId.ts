import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve the full details of a specific order item within an order
 * (ai_commerce_order_items).
 *
 * This operation fetches a single order item's details, including quantities,
 * pricing, seller information, variant/product references, fulfillment and
 * delivery status, and linked after-sales eligibility. The operation enforces
 * that only authorized users—buyers who own the parent order, relevant sellers
 * tied to the ordered item, or platform admins—may access the record. Only
 * admins can access this endpoint; authorization is validated at the
 * decorator/middleware layer via AdminPayload.
 *
 * @param props - Parameters for this query
 * @param props.admin - Authenticated admin user with global access privileges
 * @param props.orderId - UUID of the order (parent)
 * @param props.itemId - UUID of the target order item
 * @returns IAiCommerceOrderItem object with all relevant business fields mapped
 *   from DB
 * @throws {Error} If the order item does not exist for the provided
 *   orderId/itemId
 */
export async function getaiCommerceAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderItem> {
  const { orderId, itemId } = props;
  const item = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: { id: itemId, order_id: orderId },
    select: {
      id: true,
      order_id: true,
      product_variant_id: true,
      seller_id: true,
      item_code: true,
      name: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      delivery_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!item)
    throw new Error("Order item not found for the provided orderId/itemId");
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
