import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // 1. Fetch shipment, ensure not deleted and matches orderId
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found for this order", 404);
  }
  // 2. Confirm seller authorization (sellerPayload.id is customer_id; seller_id is shopping_mall_sellers.id)
  const sellerRec = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { shopping_mall_customer_id: props.seller.id },
  });
  if (!sellerRec || shipment.shopping_mall_seller_id !== sellerRec.id) {
    throw new HttpException(
      "Forbidden: You are not authorized to update this shipment",
      403,
    );
  }
  // 3. Update fields (skip changing seller/order IDs)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      shipment_code: props.body.shipment_code ?? undefined,
      external_tracking_number:
        props.body.external_tracking_number ?? undefined,
      status: props.body.status ?? undefined,
      carrier: props.body.carrier ?? undefined,
      requested_at: props.body.requested_at ?? undefined,
      shipped_at: props.body.shipped_at ?? undefined,
      delivered_at: props.body.delivered_at ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shipment_code: updated.shipment_code,
    external_tracking_number: updated.external_tracking_number ?? undefined,
    status: updated.status,
    carrier: updated.carrier ?? undefined,
    requested_at: updated.requested_at
      ? toISOStringSafe(updated.requested_at)
      : undefined,
    shipped_at: updated.shipped_at
      ? toISOStringSafe(updated.shipped_at)
      : undefined,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
