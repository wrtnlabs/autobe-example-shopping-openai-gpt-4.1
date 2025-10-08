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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdPayments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPayment.IRequest;
}): Promise<IPageIShoppingMallOrderPayment> {
  const { body, orderId } = props;

  // handle optional pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Enforce sensible maximums
  const actualLimit = limit > 100 ? 100 : limit;

  // Allowed sort fields
  const allowedSortFields = ["created_at", "paid_at", "status"];
  const sortBy = allowedSortFields.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Build where condition, handle null/undefined per schema
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.payment_type !== undefined
      ? { payment_type: body.payment_type }
      : {}),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined ? { gte: body.date_from } : {}),
            ...(body.date_to !== undefined ? { lte: body.date_to } : {}),
          },
        }
      : {}),
  };

  // Parallel query for rows and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_payments.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * actualLimit,
      take: actualLimit,
    }),
    MyGlobal.prisma.shopping_mall_order_payments.count({ where }),
  ]);

  // Map result to API type
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    order_payment_method_id: row.order_payment_method_id,
    payment_ref: row.payment_ref,
    payment_type: row.payment_type,
    status: row.status,
    paid_amount: row.paid_amount,
    currency: row.currency,
    paid_at: row.paid_at === null ? undefined : toISOStringSafe(row.paid_at),
    reconciliation_at:
      row.reconciliation_at === null
        ? undefined
        : toISOStringSafe(row.reconciliation_at),
    fail_reason: row.fail_reason === null ? undefined : row.fail_reason,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
  }));

  // Pagination structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(actualLimit),
      records: total,
      pages: Math.ceil(total / actualLimit),
    },
    data,
  };
}
