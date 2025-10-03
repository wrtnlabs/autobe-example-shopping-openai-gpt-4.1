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

export async function postShoppingMallAdminOrdersOrderIdPayments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.deleted_at) {
    throw new HttpException("Order does not exist or has been deleted.", 404);
  }
  if (props.body.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Request path orderId does not match body.shopping_mall_order_id.",
      400,
    );
  }
  if (
    order.shopping_mall_customer_id !== props.body.shopping_mall_customer_id
  ) {
    throw new HttpException(
      "Payment customer does not match order customer.",
      400,
    );
  }
  if (props.body.currency !== order.currency) {
    throw new HttpException(
      "Payment currency does not match order currency.",
      400,
    );
  }
  if (props.body.amount !== order.total_amount) {
    throw new HttpException("Payment amount does not match order total.", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      payment_type: props.body.payment_type,
      external_payment_ref: props.body.external_payment_ref ?? null,
      status: props.body.status,
      amount: props.body.amount,
      currency: props.body.currency,
      requested_at: props.body.requested_at,
      confirmed_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    payment_type: created.payment_type,
    external_payment_ref: created.external_payment_ref ?? undefined,
    status: created.status,
    amount: created.amount,
    currency: created.currency,
    requested_at:
      typeof created.requested_at === "string"
        ? created.requested_at
        : toISOStringSafe(created.requested_at),
    confirmed_at:
      created.confirmed_at != null
        ? typeof created.confirmed_at === "string"
          ? created.confirmed_at
          : toISOStringSafe(created.confirmed_at)
        : undefined,
    cancelled_at:
      created.cancelled_at != null
        ? typeof created.cancelled_at === "string"
          ? created.cancelled_at
          : toISOStringSafe(created.cancelled_at)
        : undefined,
    created_at:
      typeof created.created_at === "string"
        ? created.created_at
        : toISOStringSafe(created.created_at),
    updated_at:
      typeof created.updated_at === "string"
        ? created.updated_at
        : toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? typeof created.deleted_at === "string"
          ? created.deleted_at
          : toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
