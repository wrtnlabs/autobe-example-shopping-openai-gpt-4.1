import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdDeliveriesDeliveryId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDelivery> {
  const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findUnique({
    where: { id: props.deliveryId },
  });
  if (!delivery || delivery.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Delivery not found for this order", 404);
  }

  return {
    id: delivery.id,
    shopping_mall_order_id: delivery.shopping_mall_order_id,
    shopping_mall_shipment_id:
      delivery.shopping_mall_shipment_id === null
        ? undefined
        : delivery.shopping_mall_shipment_id,
    recipient_name: delivery.recipient_name,
    recipient_phone: delivery.recipient_phone,
    address_snapshot: delivery.address_snapshot,
    delivery_message:
      delivery.delivery_message === null
        ? undefined
        : delivery.delivery_message,
    delivery_status: delivery.delivery_status,
    confirmed_at:
      delivery.confirmed_at === null
        ? undefined
        : toISOStringSafe(delivery.confirmed_at),
    delivery_attempts: delivery.delivery_attempts,
    created_at: toISOStringSafe(delivery.created_at),
    updated_at: toISOStringSafe(delivery.updated_at),
    deleted_at:
      delivery.deleted_at === null
        ? undefined
        : toISOStringSafe(delivery.deleted_at),
  };
}
