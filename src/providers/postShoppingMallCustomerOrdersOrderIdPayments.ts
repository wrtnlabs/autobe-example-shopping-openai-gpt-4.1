import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdPayments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPayment.ICreate;
}): Promise<IShoppingMallOrderPayment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId, deleted_at: null },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      payment_method_id: true,
      order_total: true,
      currency: true,
      status: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }
  if (order.status !== "pending" && order.status !== "awaiting_payment") {
    throw new HttpException("Order is not eligible for payment", 400);
  }
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_order_payment_methods.findUnique({
      where: { id: props.body.order_payment_method_id },
      select: { id: true },
    });
  if (!paymentMethod) {
    throw new HttpException("Payment method snapshot not found", 400);
  }
  if (order.payment_method_id !== paymentMethod.id) {
    throw new HttpException(
      "Order does not reference this payment method",
      400,
    );
  }
  if (props.body.paid_amount !== order.order_total) {
    throw new HttpException("Payment amount does not match order total", 400);
  }
  if (props.body.currency !== order.currency) {
    throw new HttpException("Payment currency does not match order", 400);
  }
  if (props.body.payment_ref !== undefined) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_order_payments.findUnique({
        where: { payment_ref: props.body.payment_ref },
        select: { id: true },
      });
    if (duplicate) {
      throw new HttpException("Duplicate payment_ref", 409);
    }
  }
  const created = await MyGlobal.prisma.shopping_mall_order_payments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      order_payment_method_id: paymentMethod.id,
      payment_ref:
        props.body.payment_ref !== null && props.body.payment_ref !== undefined
          ? props.body.payment_ref
          : "",
      payment_type: props.body.payment_type,
      status: props.body.status,
      paid_amount: props.body.paid_amount,
      currency: props.body.currency,
      fail_reason: props.body.fail_reason ?? undefined,
      paid_at: undefined,
      reconciliation_at: undefined,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: undefined,
    },
  });
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    order_payment_method_id: created.order_payment_method_id,
    payment_ref: created.payment_ref ?? undefined,
    payment_type: created.payment_type,
    status: created.status,
    paid_amount: created.paid_amount,
    currency: created.currency,
    paid_at: created.paid_at ? toISOStringSafe(created.paid_at) : undefined,
    reconciliation_at: created.reconciliation_at
      ? toISOStringSafe(created.reconciliation_at)
      : undefined,
    fail_reason: created.fail_reason ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
