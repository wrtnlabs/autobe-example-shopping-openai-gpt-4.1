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

export async function putShoppingMallCustomerOrdersOrderIdPaymentsPaymentId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPayment.IUpdate;
}): Promise<IShoppingMallOrderPayment> {
  // 1. Fetch payment with related order and customer ownership verification
  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findUnique(
    {
      where: { id: props.paymentId },
      include: {
        order: true, // shopping_mall_orders
      },
    },
  );

  if (!payment || payment.deleted_at !== null) {
    throw new HttpException("Payment not found", 404);
  }
  if (!payment.order || payment.order.id !== props.orderId) {
    throw new HttpException(
      "Payment does not belong to the specified order",
      400,
    );
  }
  if (payment.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You do not own this order/payment", 403);
  }

  // Only allow update if status is 'failed' or 'pending'
  if (!["failed", "pending"].includes(payment.status)) {
    throw new HttpException(
      "Payment is not modifiable (must be in 'failed' or 'pending' state)",
      400,
    );
  }

  // Enforce allowed status transitions
  if (
    typeof props.body.status === "string" &&
    !["pending", "failed", "authorized", "captured"].includes(props.body.status)
  ) {
    throw new HttpException("Invalid status transition", 400);
  }

  // 2. Update fields supplied in body only
  const updated = await MyGlobal.prisma.shopping_mall_order_payments.update({
    where: { id: props.paymentId },
    data: {
      payment_ref: props.body.payment_ref ?? undefined,
      payment_type: props.body.payment_type ?? undefined,
      status: props.body.status ?? undefined,
      paid_amount: props.body.paid_amount ?? undefined,
      currency: props.body.currency ?? undefined,
      fail_reason: props.body.fail_reason ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Return full updated payment record per DTO contract
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    order_payment_method_id: updated.order_payment_method_id,
    payment_ref: updated.payment_ref,
    payment_type: updated.payment_type,
    status: updated.status,
    paid_amount: updated.paid_amount,
    currency: updated.currency,
    paid_at: updated.paid_at ? toISOStringSafe(updated.paid_at) : undefined,
    reconciliation_at: updated.reconciliation_at
      ? toISOStringSafe(updated.reconciliation_at)
      : undefined,
    fail_reason: updated.fail_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
