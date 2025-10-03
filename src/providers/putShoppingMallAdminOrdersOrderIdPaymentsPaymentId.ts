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

export async function putShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const { admin, orderId, paymentId, body } = props;
  // Step 1: Ensure payment exists and belongs to order
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: paymentId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found for the specified order", 404);
  }

  // Step 2: Validate allowed status transitions, if applicable
  if (body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled", "failed", "refunded"],
      confirmed: ["refunded", "cancelled", "failed"],
      paid: ["refunded", "cancelled", "failed"],
      cancelled: [],
      failed: [],
      refunded: [],
    };
    const currentStatus = payment.status;
    const nextStatus = body.status;
    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new HttpException(
        `Illegal payment status transition: ${currentStatus} → ${nextStatus}`,
        400,
      );
    }
  }

  // Step 3: Perform update (only mutable fields)
  const updateResult = await MyGlobal.prisma.shopping_mall_payments.update({
    where: {
      id: paymentId,
    },
    data: {
      payment_type: body.payment_type ?? undefined,
      external_payment_ref:
        body.external_payment_ref !== undefined
          ? body.external_payment_ref
          : undefined,
      status: body.status ?? undefined,
      amount: body.amount ?? undefined,
      currency: body.currency ?? undefined,
      requested_at:
        body.requested_at !== undefined ? body.requested_at : undefined,
      confirmed_at:
        body.confirmed_at !== undefined ? body.confirmed_at : undefined,
      cancelled_at:
        body.cancelled_at !== undefined ? body.cancelled_at : undefined,
      updated_at:
        body.updated_at !== undefined
          ? body.updated_at
          : toISOStringSafe(new Date()),
    },
  });

  // Step 4: Return mapped API object (use toISOStringSafe, correct null/undefined)
  return {
    id: updateResult.id,
    shopping_mall_order_id: updateResult.shopping_mall_order_id,
    shopping_mall_customer_id: updateResult.shopping_mall_customer_id,
    payment_type: updateResult.payment_type,
    external_payment_ref: updateResult.external_payment_ref ?? undefined,
    status: updateResult.status,
    amount: updateResult.amount,
    currency: updateResult.currency,
    requested_at: toISOStringSafe(updateResult.requested_at),
    confirmed_at: updateResult.confirmed_at
      ? toISOStringSafe(updateResult.confirmed_at)
      : undefined,
    cancelled_at: updateResult.cancelled_at
      ? toISOStringSafe(updateResult.cancelled_at)
      : undefined,
    created_at: toISOStringSafe(updateResult.created_at),
    updated_at: toISOStringSafe(updateResult.updated_at),
    deleted_at: updateResult.deleted_at
      ? toISOStringSafe(updateResult.deleted_at)
      : undefined,
  };
}
