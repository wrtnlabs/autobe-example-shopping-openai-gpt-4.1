import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdPayments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.payment_id !== undefined && { id: props.body.payment_id }),
    ...(props.body.payment_type !== undefined && {
      payment_type: props.body.payment_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.external_payment_ref !== undefined && {
      external_payment_ref: props.body.external_payment_ref,
    }),
    ...(props.body.date_from !== undefined || props.body.date_to !== undefined
      ? {
          requested_at: {
            ...(props.body.date_from !== undefined && {
              gte: props.body.date_from,
            }),
            ...(props.body.date_to !== undefined && {
              lte: props.body.date_to,
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where,
      orderBy: { requested_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        payment_type: true,
        status: true,
        amount: true,
        currency: true,
        shopping_mall_customer_id: true,
        shopping_mall_order_id: true,
        requested_at: true,
        confirmed_at: true,
        cancelled_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_payments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      payment_type: row.payment_type,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      customer_id: row.shopping_mall_customer_id,
      order_id: row.shopping_mall_order_id,
      requested_at: toISOStringSafe(row.requested_at),
      confirmed_at: row.confirmed_at ? toISOStringSafe(row.confirmed_at) : null,
      cancelled_at: row.cancelled_at ? toISOStringSafe(row.cancelled_at) : null,
    })),
  };
}
