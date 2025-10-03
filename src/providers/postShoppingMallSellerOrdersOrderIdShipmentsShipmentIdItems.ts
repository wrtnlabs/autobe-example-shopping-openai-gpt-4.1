import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.ICreate;
}): Promise<IShoppingMallShipmentItem> {
  // 1. Find the shipment by ID, verify it exists and is for this order
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: {
      id: true,
      shopping_mall_order_id: true,
    },
  });
  if (!shipment || shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment not found for this order", 404);
  }

  // 2. Find the order item by ID, verify it belongs to order and seller owns its product
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.shopping_mall_order_item_id },
    select: {
      id: true,
      shopping_mall_order_id: true,
      quantity: true,
      product: {
        select: {
          shopping_mall_seller_id: true,
        },
      },
    },
  });
  if (!orderItem || orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found for this order", 404);
  }
  if (orderItem.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this order item", 403);
  }

  // 3. Calculate previously shipped quantity to enforce over-shipment prohibition
  const prior = await MyGlobal.prisma.shopping_mall_shipment_items.aggregate({
    where: {
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
    },
    _sum: { shipped_quantity: true },
  });
  const alreadyShipped = prior._sum.shipped_quantity ?? 0;
  const willBeShipped = alreadyShipped + props.body.shipped_quantity;
  if (willBeShipped > orderItem.quantity) {
    throw new HttpException("Cannot ship more than ordered quantity", 400);
  }

  // 4. Create the shipment item
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_shipment_items.create({
    data: {
      id: v4(),
      shopping_mall_shipment_id: props.shipmentId,
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      shipped_quantity: props.body.shipped_quantity,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_shipment_id: created.shopping_mall_shipment_id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    shipped_quantity: created.shipped_quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
