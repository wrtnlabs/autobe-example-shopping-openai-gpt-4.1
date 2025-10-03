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

export async function getShoppingMallAdminOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentItem> {
  // 1. Find shipment item
  const item = await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
    where: { id: props.shipmentItemId },
  });
  if (!item) throw new HttpException("Shipment item not found", 404);
  // 2. Confirm shipment id matches
  if (item.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Shipment item does not belong to specified shipment",
      404,
    );
  }
  // 3. Fetch shipment
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  // 4. Confirm order id matches
  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Shipment does not belong to order", 404);
  }
  // 5. Return IShoppingMallShipmentItem
  return {
    id: item.id,
    shopping_mall_shipment_id: item.shopping_mall_shipment_id,
    shopping_mall_order_item_id: item.shopping_mall_order_item_id,
    shipped_quantity: item.shipped_quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  };
}
