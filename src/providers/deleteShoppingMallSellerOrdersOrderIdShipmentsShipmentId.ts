import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, orderId, shipmentId } = props;

  // Fetch shipment by ID
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: shipmentId },
  });
  if (!shipment || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found or already deleted", 404);
  }
  if (shipment.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Shipment does not belong to the specified order",
      404,
    );
  }
  if (shipment.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "You do not have permission to delete this shipment",
      403,
    );
  }

  // Only allow soft delete for cancelable/pending statuses
  const deletableStatuses = ["pending", "cancelled"];
  if (!deletableStatuses.includes(shipment.status)) {
    throw new HttpException(
      "Cannot delete shipment in its current status",
      409,
    );
  }

  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: shipmentId },
    data: { deleted_at: deletedAt },
  });

  await MyGlobal.prisma.shopping_mall_deletion_events.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      entity_type: "shipment",
      entity_id: shipmentId,
      deleted_by_id: seller.id,
      deletion_reason: "Shipment soft deleted by seller",
      snapshot_id: null,
      deleted_at: deletedAt,
      created_at: deletedAt,
    },
  });
}
