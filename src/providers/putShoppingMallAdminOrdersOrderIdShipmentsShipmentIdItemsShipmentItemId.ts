import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IUpdate;
}): Promise<IShoppingMallShipmentItem> {
  const { orderId, shipmentId, shipmentItemId, body } = props;

  // Fetch shipment item by id
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: shipmentItemId },
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found", 404);
  }
  // Confirm shipment linkage
  if (shipmentItem.shopping_mall_shipment_id !== shipmentId) {
    throw new HttpException(
      "Shipment item does not belong to the given shipment",
      400,
    );
  }

  // Fetch shipment for status and order association
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: shipmentId },
    select: { shopping_mall_order_id: true, status: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.shopping_mall_order_id !== orderId) {
    throw new HttpException("Shipment does not belong to the given order", 400);
  }
  // Shipment must not be finalized
  if (
    shipment.status === "delivered" ||
    shipment.status === "completed" ||
    shipment.status === "cancelled"
  ) {
    throw new HttpException(
      "Cannot update shipment item after shipment is finalized",
      409,
    );
  }

  // Fetch order item for validation
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: shipmentItem.shopping_mall_order_item_id },
    select: { quantity: true, shopping_mall_order_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Order item does not belong to the given order",
      400,
    );
  }

  // Sum shipped quantities of other shipment items
  const otherSum = await MyGlobal.prisma.shopping_mall_shipment_items.aggregate(
    {
      where: {
        shopping_mall_order_item_id: shipmentItem.shopping_mall_order_item_id,
        id: { not: shipmentItemId },
      },
      _sum: { shipped_quantity: true },
    },
  );
  const alreadyShipped =
    typeof otherSum._sum.shipped_quantity === "number"
      ? otherSum._sum.shipped_quantity
      : 0;
  const allowedMax = orderItem.quantity - alreadyShipped;

  if (body.shipped_quantity < 0) {
    throw new HttpException("Shipped quantity cannot be negative", 400);
  }
  if (body.shipped_quantity > allowedMax) {
    throw new HttpException(
      "Cannot ship more than ordered quantity for this order item",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_shipment_items.update({
    where: { id: shipmentItemId },
    data: {
      shipped_quantity: body.shipped_quantity,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_shipment_id: updated.shopping_mall_shipment_id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    shipped_quantity: updated.shipped_quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
