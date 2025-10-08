import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const now = toISOStringSafe(new Date());

  // Fetch order and assert ownership, active state
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.deleted_at) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Only the order owner can update",
      403,
    );
  }
  // Only allowed if not finalized
  if (["shipped", "delivered", "cancelled"].includes(order.status)) {
    throw new HttpException(
      "Order cannot be updated after shipment/delivery/cancellation",
      400,
    );
  }

  // Prepare update object
  const update: Record<string, unknown> = { updated_at: now };
  if (props.body.status !== undefined) update.status = props.body.status;
  if (props.body.business_status !== undefined)
    update.business_status = props.body.business_status;
  if (props.body.shipping_address_id !== undefined)
    update.shipping_address_id = props.body.shipping_address_id;
  if (props.body.payment_method_id !== undefined)
    update.payment_method_id = props.body.payment_method_id;

  // Do update
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: update,
  });

  // Build response API DTO
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shipping_address_id: updated.shipping_address_id,
    payment_method_id: updated.payment_method_id,
    order_number: updated.order_number,
    status: updated.status,
    business_status: updated.business_status ?? undefined,
    order_total: updated.order_total,
    currency: updated.currency,
    placed_at: toISOStringSafe(updated.placed_at),
    paid_at: updated.paid_at ? toISOStringSafe(updated.paid_at) : undefined,
    fulfilled_at: updated.fulfilled_at
      ? toISOStringSafe(updated.fulfilled_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
