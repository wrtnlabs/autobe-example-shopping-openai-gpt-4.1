import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new after-sales case for an order (ai_commerce_order_after_sales).
 *
 * Allows an authorized seller (who owns a store with products in the order) to
 * submit a new after-sales request (e.g., return, exchange, dispute, warranty
 * claim) for an order they are involved with. This checks that the order exists
 * and is not deleted, and, if order_item_id is supplied, that the seller owns
 * the item.
 *
 * @param props - Provider props
 * @param props.seller - The authenticated SellerPayload for role authorization
 * @param props.orderId - The target order UUID to create after-sales for
 * @param props.body - After-sales case creation data
 *   (IAiCommerceOrderAfterSales.ICreate)
 * @returns The newly created after-sales case record
 *   (IAiCommerceOrderAfterSales)
 * @throws {Error} When order or order item is not found or seller is
 *   unauthorized
 */
export async function postaiCommerceSellerOrdersOrderIdAfterSales(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.ICreate;
}): Promise<IAiCommerceOrderAfterSales> {
  const { seller, orderId, body } = props;

  // Fetch the order, ensure it exists and is not deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId, deleted_at: null },
    select: { id: true },
  });
  if (!order) throw new Error("Order not found or has been deleted");

  // Seller account validity check is already enforced by decorator/provider

  // If order_item_id is present, ensure it belongs to the order and to the seller
  if (body.order_item_id != null) {
    const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
      where: { id: body.order_item_id },
      select: { id: true, order_id: true, seller_id: true },
    });
    if (!orderItem) {
      throw new Error("Order item not found");
    }
    if (orderItem.order_id !== orderId) {
      throw new Error("Order item does not belong to the specified order");
    }
    // Seller id corresponds to ai_commerce_seller.id; seller's buyer_id is seller.id
    const sellerEntity = await MyGlobal.prisma.ai_commerce_seller.findFirst({
      where: { buyer_id: seller.id, deleted_at: null },
      select: { id: true },
    });
    if (!sellerEntity || orderItem.seller_id !== sellerEntity.id) {
      throw new Error("Unauthorized: Seller does not own the order item");
    }
  }

  // Create after-sales record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_order_after_sales.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      order_item_id: body.order_item_id ?? undefined,
      actor_id: seller.id,
      type: body.type,
      status: "pending",
      opened_at: now,
      note: body.note ?? undefined,
    },
  });

  // Compose return value according to IAiCommerceOrderAfterSales
  return {
    id: created.id,
    order_id: created.order_id,
    order_item_id: created.order_item_id ?? undefined,
    actor_id: created.actor_id,
    type: created.type,
    status: created.status,
    opened_at: toISOStringSafe(created.opened_at),
    closed_at: created.closed_at
      ? toISOStringSafe(created.closed_at)
      : undefined,
    note: created.note ?? undefined,
  };
}
