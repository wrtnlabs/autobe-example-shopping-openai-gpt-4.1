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

export async function getShoppingMallCustomerOrdersOrderIdDeliveriesDeliveryId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDelivery> {
  // Step 1: Fetch delivery and ensure soft-delete is not present and correct order linkage
  const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findFirst({
    where: {
      id: props.deliveryId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!delivery) {
    throw new HttpException("Delivery not found", 404);
  }

  // Step 2: Ensure order belongs to this customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this order's deliveries",
      403,
    );
  }

  // Step 3: Prepare the return object, respecting exact type rules
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
