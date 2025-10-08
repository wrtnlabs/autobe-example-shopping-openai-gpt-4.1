import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderShipment.IUpdate;
}): Promise<IShoppingMallOrderShipment> {
  // 1. Find shipment and ensure it matches orderId
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found for this order.", 404);
  }

  // 2. Check that the order is actually owned by this seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "You are not authorized to update this shipment.",
      403,
    );
  }

  // 3. Business rules: forbid delivered before shipped/dispatched
  if (
    props.body.status === "delivered" &&
    !shipment.dispatched_at &&
    !props.body.dispatched_at
  ) {
    throw new HttpException(
      "Cannot set status to delivered before shipment is dispatched.",
      400,
    );
  }

  // 4. Do update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_order_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier: props.body.carrier,
      tracking_number:
        props.body.tracking_number !== undefined
          ? props.body.tracking_number
          : undefined,
      status: props.body.status,
      dispatched_at:
        props.body.dispatched_at !== undefined &&
        props.body.dispatched_at !== null
          ? toISOStringSafe(props.body.dispatched_at)
          : (props.body.dispatched_at ?? undefined),
      delivered_at:
        props.body.delivered_at !== undefined &&
        props.body.delivered_at !== null
          ? toISOStringSafe(props.body.delivered_at)
          : (props.body.delivered_at ?? undefined),
      remark: props.body.remark !== undefined ? props.body.remark : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shipment_number: updated.shipment_number,
    carrier: updated.carrier,
    tracking_number: updated.tracking_number ?? null,
    status: updated.status,
    dispatched_at:
      updated.dispatched_at != null
        ? toISOStringSafe(updated.dispatched_at)
        : null,
    delivered_at:
      updated.delivered_at != null
        ? toISOStringSafe(updated.delivered_at)
        : null,
    remark: updated.remark ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
