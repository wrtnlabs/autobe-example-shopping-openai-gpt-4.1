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

export async function putShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IUpdate;
}): Promise<IShoppingMallShipmentItem> {
  // Fetch the shipment item by id, along with shipment and order item info for business constraints
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: props.shipmentItemId },
    });
  if (!shipmentItem) throw new HttpException("Shipment item not found", 404);
  if (shipmentItem.shopping_mall_shipment_id !== props.shipmentId)
    throw new HttpException("Shipment item does not match shipment", 404);

  // Fetch shipment for status and seller ownership
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: shipmentItem.shopping_mall_shipment_id },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // Seller authorization: check that seller owns this shipment
  if (shipment.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException(
      "Forbidden: Cannot update shipment item of another seller's shipment",
      403,
    );

  // Check that shipment status is NOT finalized (pending/active only)
  if (["delivered", "completed", "shipped"].includes(shipment.status))
    throw new HttpException(
      "Cannot update shipment item of a finalized/delivered shipment",
      400,
    );

  // Fetch the order item to check total ordered quantity and calculate constraints
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: shipmentItem.shopping_mall_order_item_id },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);

  // Calculate sum of all shipped_quantity for this order item across shipment items in the order
  const otherShipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shopping_mall_order_item_id: shipmentItem.shopping_mall_order_item_id,
        id: { not: shipmentItem.id },
      },
    });
  const otherTotal = otherShipmentItems.reduce(
    (sum, item) =>
      sum +
      (typeof item.shipped_quantity === "number" ? item.shipped_quantity : 0),
    0,
  );
  const proposedTotal = otherTotal + props.body.shipped_quantity;

  if (props.body.shipped_quantity < 0)
    throw new HttpException("shipped_quantity cannot be negative", 400);
  if (proposedTotal > orderItem.quantity)
    throw new HttpException("shipped_quantity exceeds ordered quantity", 400);
  if (props.body.shipped_quantity === 0 && orderItem.quantity > 0)
    throw new HttpException(
      "Cannot remove all items from shipment batch if ordered quantity still remains",
      400,
    );

  // Update the shipment item (only shipped_quantity and updated_at are mutable)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_shipment_items.update({
    where: { id: shipmentItem.id },
    data: {
      shipped_quantity: props.body.shipped_quantity,
      updated_at: now,
    },
  });

  // Compose and return the entity in required format without type assertions or Date
  return {
    id: updated.id,
    shopping_mall_shipment_id: updated.shopping_mall_shipment_id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    shipped_quantity: updated.shipped_quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
