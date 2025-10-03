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

export async function postShoppingMallCustomerOrdersOrderIdDeliveries(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallDelivery.ICreate;
}): Promise<IShoppingMallDelivery> {
  const { customer, orderId, body } = props;

  // 1. Authorization and order existence check
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // 2. Prevent delivery creation for completed/cancelled orders
  if (order.status === "completed" || order.status === "cancelled") {
    throw new HttpException(
      "Cannot add delivery for completed or cancelled orders",
      400,
    );
  }

  // 3. Prepare timestamp values
  const now = toISOStringSafe(new Date());

  // 4. Create delivery record
  const created = await MyGlobal.prisma.shopping_mall_deliveries.create({
    data: {
      id: v4(),
      shopping_mall_order_id: orderId,
      // Only include optional shipment id if provided
      ...(body.shopping_mall_shipment_id !== undefined && {
        shopping_mall_shipment_id: body.shopping_mall_shipment_id,
      }),
      recipient_name: body.recipient_name,
      recipient_phone: body.recipient_phone,
      address_snapshot:
        body.address_snapshot !== undefined ? body.address_snapshot : "",
      // Only include delivery_message if provided
      ...(body.delivery_message !== undefined && {
        delivery_message: body.delivery_message,
      }),
      delivery_status: body.delivery_status,
      delivery_attempts: body.delivery_attempts,
      confirmed_at: undefined, // not confirmed on creation
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // 5. Map to API return type, converting all date fields with toISOStringSafe
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_shipment_id:
      created.shopping_mall_shipment_id === undefined ||
      created.shopping_mall_shipment_id === null
        ? undefined
        : created.shopping_mall_shipment_id,
    recipient_name: created.recipient_name,
    recipient_phone: created.recipient_phone,
    address_snapshot: created.address_snapshot,
    delivery_message:
      created.delivery_message === undefined ||
      created.delivery_message === null
        ? undefined
        : created.delivery_message,
    delivery_status: created.delivery_status,
    confirmed_at: created.confirmed_at
      ? toISOStringSafe(created.confirmed_at)
      : undefined,
    delivery_attempts: created.delivery_attempts,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
