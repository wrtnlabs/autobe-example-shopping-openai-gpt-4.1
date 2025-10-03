import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdDeliveriesDeliveryId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  body: IShoppingMallDelivery.IUpdate;
}): Promise<IShoppingMallDelivery> {
  // 1. Find the delivery record, ensure not deleted and correct order linkage
  const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findFirst({
    where: {
      id: props.deliveryId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    include: {
      order: true, // Prisma implicit relation
    },
  });
  if (!delivery) {
    throw new HttpException("Delivery not found", 404);
  }
  // 2. Authorization: check if order belongs to requesting customer
  if (
    !delivery.order ||
    delivery.order.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Unauthorized to update this delivery", 403);
  }
  // 3. Forbid update if already delivered or confirmed
  if (
    delivery.delivery_status === "delivered" ||
    delivery.delivery_status === "confirmed"
  ) {
    throw new HttpException("Cannot update after delivery is finalized", 400);
  }
  // 4. Update the delivery
  const updated = await MyGlobal.prisma.shopping_mall_deliveries.update({
    where: { id: props.deliveryId },
    data: {
      recipient_name: props.body.recipient_name,
      recipient_phone: props.body.recipient_phone,
      address_snapshot: props.body.address_snapshot,
      delivery_message: props.body.delivery_message ?? undefined,
      delivery_status: props.body.delivery_status,
      confirmed_at: props.body.confirmed_at ?? undefined,
      delivery_attempts: props.body.delivery_attempts,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Return the updated entity as IShoppingMallDelivery
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_shipment_id: updated.shopping_mall_shipment_id ?? undefined,
    recipient_name: updated.recipient_name,
    recipient_phone: updated.recipient_phone,
    address_snapshot: updated.address_snapshot,
    delivery_message: updated.delivery_message ?? undefined,
    delivery_status: updated.delivery_status,
    confirmed_at: updated.confirmed_at
      ? toISOStringSafe(updated.confirmed_at)
      : undefined,
    delivery_attempts: updated.delivery_attempts,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
