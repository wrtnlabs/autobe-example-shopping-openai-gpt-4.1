import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdRefunds(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefund.ICreate;
}): Promise<IShoppingMallOrderRefund> {
  const { customer, orderId, body } = props;

  // 1. Fetch and validate order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found or already deleted", 404);
  }
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "You do not have permission to refund this order",
      403,
    );
  }
  if (!order.paid_at) {
    throw new HttpException(
      "Order has not been paid and is not eligible for refund",
      400,
    );
  }

  let refundedPayment = null;
  if (body.refunded_payment_id !== undefined) {
    refundedPayment =
      await MyGlobal.prisma.shopping_mall_order_payments.findUnique({
        where: {
          id: body.refunded_payment_id,
          shopping_mall_order_id: order.id,
        },
      });
    if (!refundedPayment) {
      throw new HttpException("Invalid payment reference for refund", 400);
    }
    if (
      refundedPayment.status !== "captured" &&
      refundedPayment.status !== "authorized"
    ) {
      throw new HttpException(
        "Refund can only be requested for a successful payment",
        400,
      );
    }
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    throw new HttpException(
      "Refund request is not permitted for cancelled or already refunded order",
      400,
    );
  }

  const refundWhere: Record<string, unknown> = {
    shopping_mall_order_id: order.id,
  };
  if (body.refunded_payment_id !== undefined) {
    refundWhere["refunded_payment_id"] = body.refunded_payment_id;
  }
  const refunds = await MyGlobal.prisma.shopping_mall_order_refunds.findMany({
    where: refundWhere,
  });
  const previousRefunded = refunds.reduce(
    (sum, r) => sum + Number(r.refund_amount),
    0,
  );

  const paidAmount = refundedPayment
    ? Number(refundedPayment.paid_amount)
    : Number(order.order_total);
  if (
    body.refund_amount <= 0 ||
    body.refund_amount + previousRefunded > paidAmount
  ) {
    throw new HttpException(
      "Requested refund amount exceeds available eligible amount",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_order_refunds.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      refunded_payment_id: body.refunded_payment_id,
      initiator_customer_id: customer.id,
      reason_code: body.reason_code,
      status: "pending",
      refund_amount: body.refund_amount,
      currency: body.currency,
      requested_at: now,
      explanation: body.explanation,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    refunded_payment_id: created.refunded_payment_id ?? undefined,
    initiator_customer_id: created.initiator_customer_id ?? undefined,
    initiator_admin_id: undefined,
    reason_code: created.reason_code,
    status: created.status,
    refund_amount: created.refund_amount,
    currency: created.currency,
    requested_at: toISOStringSafe(created.requested_at),
    settled_at:
      created.settled_at !== null && created.settled_at !== undefined
        ? toISOStringSafe(created.settled_at)
        : undefined,
    explanation: created.explanation ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
