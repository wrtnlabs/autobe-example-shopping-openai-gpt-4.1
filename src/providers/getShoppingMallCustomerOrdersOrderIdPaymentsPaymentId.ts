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

export async function getShoppingMallCustomerOrdersOrderIdPaymentsPaymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderPayment> {
  const { customer, orderId, paymentId } = props;

  // 1. Fetch payment entry (must not be deleted, and must belong to orderId)
  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findFirst({
    where: {
      id: paymentId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  // 2. Fetch order to confirm ownership and non-deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Forbidden: You are not allowed to access this payment for this order",
      403,
    );
  }

  // 3. Map fields with type safety and proper null/undefined mapping
  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    order_payment_method_id: payment.order_payment_method_id,
    payment_ref: payment.payment_ref,
    payment_type: payment.payment_type,
    status: payment.status,
    paid_amount: payment.paid_amount,
    currency: payment.currency,
    paid_at: payment.paid_at ? toISOStringSafe(payment.paid_at) : undefined,
    reconciliation_at: payment.reconciliation_at
      ? toISOStringSafe(payment.reconciliation_at)
      : undefined,
    fail_reason: payment.fail_reason ?? undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at
      ? toISOStringSafe(payment.deleted_at)
      : undefined,
  };
}
