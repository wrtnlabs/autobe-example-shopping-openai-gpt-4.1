import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve the full details of a specific order item within an order
 * (ai_commerce_order_items).
 *
 * This function fetches a single order item's details, including quantities,
 * pricing, seller info, variant and product references, fulfillment/delivery
 * status, and linked after-sales eligibility. It strictly enforces seller
 * access control, requiring the authenticated seller to match the seller_id on
 * the order item, and ensures both the orderId and itemId correspond to valid
 * data. Date/time values are returned as ISO 8601 strings with appropriate
 * branding; optional fields are handled as undefined if not present in the
 * database.
 *
 * Authorization: Only a seller whose platform user (buyer_id) matches the
 * ai_commerce_order_items.seller_id for the specific item is allowed access.
 * Both the parent order and the item must exist. If unauthorized or not found,
 * throws Error.
 *
 * @param props - The parameters for this API operation
 * @param props.seller - The authenticated seller making the request (from
 *   SellerAuth/SellerPayload)
 * @param props.orderId - The UUID of the parent order
 * @param props.itemId - The UUID of the order item (must belong to orderId &
 *   seller)
 * @returns The full order item detail as IAiCommerceOrderItem
 * @throws {Error} If seller does not exist/authorized, or order item does not
 *   exist or does not belong to the seller
 */
export async function getaiCommerceSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderItem> {
  const { seller, orderId, itemId } = props;

  // Fetch seller entity by payload ID (which is buyer_id), status must be active/under_review/suspended, not deleted
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
  });
  if (!sellerRow) {
    throw new Error("Seller not found or not active");
  }

  // Fetch the order item using provided itemId and orderId, restricting to seller ownership
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: itemId,
      order_id: orderId,
      seller_id: sellerRow.id,
    },
  });
  if (!orderItem) {
    throw new Error("Order item not found or access denied");
  }

  // Map to DTO with proper branding and undefined handling for optional/nullables
  return {
    id: orderItem.id,
    order_id: orderItem.order_id,
    product_variant_id: orderItem.product_variant_id,
    seller_id: orderItem.seller_id ?? undefined,
    item_code: orderItem.item_code,
    name: orderItem.name,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    delivery_status: orderItem.delivery_status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at: orderItem.deleted_at
      ? toISOStringSafe(orderItem.deleted_at)
      : undefined,
  };
}
