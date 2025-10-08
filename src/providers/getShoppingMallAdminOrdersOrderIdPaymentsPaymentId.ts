import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found for the specified order.", 404);
  }
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
