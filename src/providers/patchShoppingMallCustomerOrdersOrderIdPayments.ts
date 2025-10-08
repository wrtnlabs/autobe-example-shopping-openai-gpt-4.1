import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdPayments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPayment.IRequest;
}): Promise<IPageIShoppingMallOrderPayment> {
  const { customer, orderId, body } = props;

  // 1. Ownership and existence check
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: cannot access payments for others' orders",
      403,
    );
  }

  // 2. Build filters inline
  const filters: Record<string, unknown> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.payment_type !== undefined && { payment_type: body.payment_type }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          paid_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
  };

  // 3. Pagination: default values and calculation
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 4. Sorting field & order
  const sortField = body.sortBy ?? "created_at";
  const sortOrder =
    body.sortDirection === "asc" || body.sortDirection === "desc"
      ? body.sortDirection
      : "desc";

  // 5. Query & mapping
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_payments.findMany({
      where: filters,
      orderBy: { [sortField]: sortOrder },
      skip: skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_order_payments.count({ where: filters }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    shopping_mall_order_id: r.shopping_mall_order_id,
    order_payment_method_id: r.order_payment_method_id,
    payment_ref: r.payment_ref,
    payment_type: r.payment_type,
    status: r.status,
    paid_amount: r.paid_amount,
    currency: r.currency,
    paid_at: r.paid_at == null ? undefined : toISOStringSafe(r.paid_at),
    reconciliation_at:
      r.reconciliation_at == null
        ? undefined
        : toISOStringSafe(r.reconciliation_at),
    fail_reason: r.fail_reason === null ? undefined : r.fail_reason,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at:
      r.deleted_at == null ? undefined : toISOStringSafe(r.deleted_at),
  }));
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };
  return { pagination, data };
}
