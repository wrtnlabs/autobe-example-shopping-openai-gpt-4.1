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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdPayments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderPayment.IRequest;
}): Promise<IPageIShoppingMallOrderPayment> {
  const { seller, orderId, body } = props;
  // 1. Confirm order exists & is owned by this seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or you do not have permission to view its payments.",
      403,
    );
  }

  // 2. Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Prepare filters for payments
  const where = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.payment_type !== undefined && { payment_type: body.payment_type }),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined && { gte: body.date_from }),
            ...(body.date_to !== undefined && { lte: body.date_to }),
          },
        }
      : {}),
  };

  // 4. Sorting
  const allowedSorts = ["created_at", "paid_at", "status"];
  const sortBy = allowedSorts.includes(body.sortBy ?? "")
    ? body.sortBy!
    : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // 5. Query paginated payments and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_payments.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_payments.count({ where }),
  ]);

  // 6. DTO map, dates as string & tags.Format<'date-time'>, optionals handled as undefined
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_order_id: row.shopping_mall_order_id,
      order_payment_method_id: row.order_payment_method_id,
      payment_ref: row.payment_ref,
      payment_type: row.payment_type,
      status: row.status,
      paid_amount: row.paid_amount,
      currency: row.currency,
      paid_at: row.paid_at ? toISOStringSafe(row.paid_at) : undefined,
      reconciliation_at: row.reconciliation_at
        ? toISOStringSafe(row.reconciliation_at)
        : undefined,
      fail_reason: row.fail_reason ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
