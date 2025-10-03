import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, orderId, shipmentId, shipmentItemId } = props;
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: shipmentId },
    select: {
      shopping_mall_order_id: true,
      shopping_mall_seller_id: true,
      status: true,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found.", 404);
  }
  if (shipment.shopping_mall_order_id !== orderId) {
    throw new HttpException("Shipment does not belong to provided order.", 400);
  }
  if (shipment.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "You are not authorized to modify this shipment.",
      403,
    );
  }
  if (
    ["shipped", "delivered", "completed", "cancelled", "returned"].includes(
      shipment.status,
    )
  ) {
    throw new HttpException(
      "Cannot delete shipment item from a finalized or shipped batch.",
      400,
    );
  }
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUnique({
      where: { id: shipmentItemId },
      select: {
        shopping_mall_shipment_id: true,
      },
    });
  if (!shipmentItem) {
    throw new HttpException("Shipment item not found.", 404);
  }
  if (shipmentItem.shopping_mall_shipment_id !== shipmentId) {
    throw new HttpException(
      "Shipment item does not belong to provided shipment.",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_shipment_items.delete({
    where: { id: shipmentItemId },
  });
  return;
}
