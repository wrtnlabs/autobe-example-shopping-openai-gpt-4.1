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

export async function postShoppingMallAdminOrdersOrderIdShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.ICreate;
}): Promise<IShoppingMallShipmentItem> {
  const now = toISOStringSafe(new Date());

  // 1. Check shipment existence and order match
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, shopping_mall_order_id: true },
  });
  if (!shipment || shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment not found or does not belong to given order.",
      404,
    );
  }

  // 2. Check order item existence and order match
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.shopping_mall_order_item_id },
    select: { id: true, shopping_mall_order_id: true, quantity: true },
  });
  if (!orderItem || orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item not found or does not belong to given order.",
      400,
    );
  }

  // 3. Check for duplicate (shipmentId + orderItemId) shipment item
  const duplicate =
    await MyGlobal.prisma.shopping_mall_shipment_items.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "This order item has already been added to this shipment.",
      409,
    );
  }

  // 4. Calculate already shipped quantity for this order item across all shipments
  const shippedRecords =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      },
      select: { shipped_quantity: true },
    });
  const shippedSoFar = shippedRecords.reduce(
    (sum, rec) => sum + rec.shipped_quantity,
    0,
  );
  const remaining = orderItem.quantity - shippedSoFar;
  if (props.body.shipped_quantity > remaining) {
    throw new HttpException(
      `Cannot ship more units than remaining (${remaining}).`,
      400,
    );
  }

  // 5. Create shipment item row
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
