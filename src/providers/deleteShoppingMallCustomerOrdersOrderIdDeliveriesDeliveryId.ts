import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdDeliveriesDeliveryId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the delivery, include related order for authorization check
  const delivery = await MyGlobal.prisma.shopping_mall_deliveries.findFirst({
    where: {
      id: props.deliveryId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    include: {
      order: {
        select: { shopping_mall_customer_id: true },
      },
    },
  });
  if (!delivery) {
    throw new HttpException("Delivery not found", 404);
  }
  if (delivery.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this delivery record",
      403,
    );
  }
  // Only allow if delivery_status NOT in delivered/confirmed/immutable
  // (business rule; block if delivery is delivered/confirmed etc.)
  const notCancellableStatuses = [
    "dispatched",
    "shipped",
    "delivered",
    "completed",
    "confirmed",
  ];
  if (notCancellableStatuses.includes(delivery.delivery_status)) {
    throw new HttpException(
      "Cannot delete a delivery that is already shipped or completed",
      409,
    );
  }
  // Soft delete: update deleted_at to now
  await MyGlobal.prisma.shopping_mall_deliveries.update({
    where: {
      id: props.deliveryId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
