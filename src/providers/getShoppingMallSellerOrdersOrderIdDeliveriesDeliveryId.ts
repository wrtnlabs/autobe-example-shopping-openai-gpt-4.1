import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdDeliveriesDeliveryId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDelivery> {
  const { seller, orderId, deliveryId } = props;

  // 1. Find delivery by id, order id, and not deleted
  const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findFirst({
    where: {
      id: deliveryId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
  });
  if (!delivery) {
    throw new HttpException("Delivery not found", 404);
  }

  // 2. Confirm seller has at least one item in this order and not deleted
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException(
      "Forbidden: You do not have access to this order's delivery.",
      403,
    );
  }

  // 3. Return mapped delivery (convert all dates with toISOStringSafe)
  return {
    id: delivery.id,
    shopping_mall_order_id: delivery.shopping_mall_order_id,
    shopping_mall_shipment_id: delivery.shopping_mall_shipment_id ?? undefined,
    recipient_name: delivery.recipient_name,
    recipient_phone: delivery.recipient_phone,
    address_snapshot: delivery.address_snapshot,
    delivery_message: delivery.delivery_message ?? undefined,
    delivery_status: delivery.delivery_status,
    confirmed_at: delivery.confirmed_at
      ? toISOStringSafe(delivery.confirmed_at)
      : undefined,
    delivery_attempts: delivery.delivery_attempts,
    created_at: toISOStringSafe(delivery.created_at),
    updated_at: toISOStringSafe(delivery.updated_at),
    deleted_at: delivery.deleted_at
      ? toISOStringSafe(delivery.deleted_at)
      : undefined,
  };
}
