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

export async function getShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentItem> {
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: props.shipmentItemId },
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found", 404);
  }
  if (shipmentItem.shopping_mall_shipment_id !== props.shipmentId) {
    throw new HttpException(
      "Shipment item does not belong to the specified shipment",
      404,
    );
  }
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      404,
    );
  }
  const sellerRow = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: shipment.shopping_mall_seller_id },
  });
  if (!sellerRow || sellerRow.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  if (sellerRow.shopping_mall_customer_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Seller does not own this shipment",
      403,
    );
  }
  return {
    id: shipmentItem.id,
    shopping_mall_shipment_id: shipmentItem.shopping_mall_shipment_id,
    shopping_mall_order_item_id: shipmentItem.shopping_mall_order_item_id,
    shipped_quantity: shipmentItem.shipped_quantity,
    created_at: toISOStringSafe(shipmentItem.created_at),
    updated_at: toISOStringSafe(shipmentItem.updated_at),
  };
}
