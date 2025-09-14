import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommercePayments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayments";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Initiates payment for a specific order (ai_commerce_orders), validated for
 * ownership, order status, and eligibility.
 *
 * This operation accepts payment initiation data from an authenticated buyer,
 * validates order state, and creates both a new ai_commerce_payments record and
 * an ai_commerce_order_payments linkage. All fields are type-checked per strict
 * business and DTO rules. Only the order owner may perform this action.
 * Timestamps and IDs are string & tags.Format<'date-time'> or <'uuid'>, with
 * absolutely no use of Date types or type assertions.
 *
 * @param props - The request context, including authenticated buyer, parameter
 *   orderId, and payment initiation body.
 * @returns The resulting IAiCommercePayments record for the created payment.
 * @throws {Error} If the order is not found, not owned by the buyer, not in
 *   payment_pending, or payment details mismatch.
 */
export async function postaiCommerceBuyerOrdersOrderIdPay(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommercePayments.ICreate;
}): Promise<IAiCommercePayments> {
  const { buyer, orderId, body } = props;
  // 1. Retrieve the order and enforce buyer ownership and eligibility
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      buyer_id: true,
      status: true,
      total_price: true,
      currency: true,
    },
  });
  if (!order || order.buyer_id !== buyer.id) {
    throw new Error("Order not found or not owned by buyer");
  }
  if (order.status !== "payment_pending") {
    throw new Error("Order is not eligible for payment");
  }
  if (order.total_price !== body.amount) {
    throw new Error("Payment amount does not match order total");
  }
  if (order.currency !== body.currency_code) {
    throw new Error("Payment currency does not match order currency");
  }
  // 2. Create payment record
  const paymentId = v4();
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_payments.create({
    data: {
      id: paymentId,
      payment_reference: body.payment_reference,
      status: body.status,
      amount: body.amount,
      currency_code: body.currency_code,
      issued_at: toISOStringSafe(body.issued_at),
      confirmed_at:
        body.confirmed_at !== undefined && body.confirmed_at !== null
          ? toISOStringSafe(body.confirmed_at)
          : undefined,
      failure_reason:
        body.failure_reason !== undefined ? body.failure_reason : undefined,
      created_at: now,
      updated_at: now,
    },
  });
  // 3. Link payment to order (NOTE: use 'applied_at' instead of 'created_at')
  const orderPaymentId = v4();
  await MyGlobal.prisma.ai_commerce_order_payments.create({
    data: {
      id: orderPaymentId,
      order_id: orderId,
      payment_id: paymentId,
      payment_code: body.payment_reference,
      status: body.status,
      amount: body.amount,
      currency: body.currency_code,
      applied_at: now,
      // settled_at: null, // leave unset, will be null by default per schema for not-yet-settled
    },
  });
  // 4. Map result to IAiCommercePayments DTO, converting all dates
  return {
    id: created.id,
    payment_reference: created.payment_reference,
    status: created.status,
    amount: created.amount,
    currency_code: created.currency_code,
    issued_at: toISOStringSafe(created.issued_at),
    confirmed_at:
      created.confirmed_at !== null && created.confirmed_at !== undefined
        ? toISOStringSafe(created.confirmed_at)
        : undefined,
    failure_reason:
      created.failure_reason !== undefined ? created.failure_reason : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
