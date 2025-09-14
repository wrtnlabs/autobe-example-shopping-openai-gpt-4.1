import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates the fields of an existing order item within a specific order
 * (seller-only).
 *
 * This function allows an authenticated seller to modify certain fields
 * (delivery_status, quantity, unit_price, total_price) of an order item that
 * belongs to them and is not deleted. The item must be matched by both itemId
 * and orderId, and permissions are enforced strictly: only the seller who
 * originally created the item (matched by ai_commerce_seller.buyer_id) may edit
 * it. All changes update the updated_at timestamp, and all dates are returned
 * as ISO strings. Throws errors on missing item/ownership.
 *
 * @param props - The request parameters for this operation
 * @param props.seller - The authenticated seller performing the update
 * @param props.orderId - UUID of the parent order for the item
 * @param props.itemId - UUID of the order item to update
 * @param props.body - Fields to update (delivery_status, quantity, unit_price,
 *   total_price)
 * @returns The updated order item, strictly conformant to IAiCommerceOrderItem
 *   (all date-times as branded strings)
 * @throws {Error} If the seller is not present/active, or the order item is not
 *   found or not owned by the seller
 */
export async function putaiCommerceSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.IUpdate;
}): Promise<IAiCommerceOrderItem> {
  const { seller, orderId, itemId, body } = props;

  // Step 1: Confirm seller account: ensure present, not deleted
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
  });
  if (!sellerRecord) throw new Error("Seller not found or not active.");

  // Step 2: Fetch order item with matching ownership, order, not deleted
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: itemId,
      order_id: orderId,
      seller_id: sellerRecord.id,
      deleted_at: null,
    },
  });
  if (!orderItem)
    throw new Error("Order item not found or not owned by seller.");

  // Step 3: Update allowed fields and touch updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_order_items.update({
    where: { id: itemId },
    data: {
      delivery_status: body.delivery_status ?? undefined,
      quantity: body.quantity ?? undefined,
      unit_price: body.unit_price ?? undefined,
      total_price: body.total_price ?? undefined,
      updated_at: now,
    },
  });

  // Step 4: Return strict DTO with all date handling and null→undefined mapping
  return {
    id: updated.id,
    order_id: updated.order_id,
    product_variant_id: updated.product_variant_id,
    seller_id: updated.seller_id === null ? undefined : updated.seller_id,
    item_code: updated.item_code,
    name: updated.name,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    delivery_status: updated.delivery_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
