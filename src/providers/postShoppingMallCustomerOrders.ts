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

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const customerId = props.customer.id;
  const now = toISOStringSafe(new Date());

  // Validate that the referenced shipping address snapshot exists and belongs to the customer
  const address = await MyGlobal.prisma.shopping_mall_order_addresses.findFirst(
    {
      where: {
        id: props.body.shipping_address_id,
      },
    },
  );
  if (!address) {
    throw new HttpException("Shipping address not found", 404);
  }

  // Validate that the payment method snapshot exists
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.findFirst({
      where: {
        id: props.body.payment_method_id,
      },
    });
  if (!paymentMethod) {
    throw new HttpException("Payment method not found", 404);
  }

  // Generate order number in format ORD-YYYYMMDD-xxxxxx where xxxxxx is random 6 digits
  const dateString = now.slice(0, 10).replace(/-/g, "");
  const randomDigits = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  const orderNumber = `ORD-${dateString}-${randomDigits}`;

  // Create order - all required fields present
  const created = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customerId,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id ?? null,
      shipping_address_id: props.body.shipping_address_id,
      payment_method_id: props.body.payment_method_id,
      order_number: orderNumber,
      status: "pending",
      business_status: null,
      order_total: props.body.order_total,
      currency: props.body.currency,
      placed_at: now,
      paid_at: null,
      fulfilled_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id ?? undefined,
    shipping_address_id: created.shipping_address_id,
    payment_method_id: created.payment_method_id,
    order_number: created.order_number,
    status: created.status,
    business_status: created.business_status ?? undefined,
    order_total: created.order_total,
    currency: created.currency,
    placed_at: toISOStringSafe(created.placed_at),
    paid_at: created.paid_at ? toISOStringSafe(created.paid_at) : undefined,
    fulfilled_at: created.fulfilled_at
      ? toISOStringSafe(created.fulfilled_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
