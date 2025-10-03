import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found for given order", 404);
  }
  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    shopping_mall_customer_id: payment.shopping_mall_customer_id,
    payment_type: payment.payment_type,
    external_payment_ref: payment.external_payment_ref ?? undefined,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    requested_at: toISOStringSafe(payment.requested_at),
    confirmed_at: payment.confirmed_at
      ? toISOStringSafe(payment.confirmed_at)
      : undefined,
    cancelled_at: payment.cancelled_at
      ? toISOStringSafe(payment.cancelled_at)
      : undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at
      ? toISOStringSafe(payment.deleted_at)
      : undefined,
  };
}
