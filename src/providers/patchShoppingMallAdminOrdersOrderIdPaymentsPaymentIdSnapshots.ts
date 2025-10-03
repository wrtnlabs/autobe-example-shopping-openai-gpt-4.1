import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSnapshot";
import { IPageIShoppingMallPaymentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdPaymentsPaymentIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentSnapshot.IRequest;
}): Promise<IPageIShoppingMallPaymentSnapshot> {
  // Step 1: Confirm admin
  if (props.admin.type !== "admin") {
    throw new HttpException(
      "Unauthorized: Only admins may access payment snapshots",
      403,
    );
  }
  // Step 2: Check order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Step 3: Check payment exists for that order
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId },
    select: { id: true, shopping_mall_order_id: true },
  });
  if (!payment || payment.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Payment not found or not associated with order",
      404,
    );
  }

  // Step 4: Extract filters from body
  const {
    created_from,
    created_to,
    limit,
    page,
    sort_by,
    sort_order,
    shopping_mall_payment_id,
  } = props.body;
  if (
    typeof sort_by !== "undefined" &&
    sort_by !== "created_at" &&
    sort_by !== "id"
  ) {
    throw new HttpException("Invalid sort_by field", 400);
  }
  if (
    typeof sort_order !== "undefined" &&
    sort_order !== "asc" &&
    sort_order !== "desc"
  ) {
    throw new HttpException("Invalid sort_order field", 400);
  }

  // Step 5: Pagination
  const perPage = limit ?? 50;
  const currentPage = page ?? 1;
  const skip = (currentPage - 1) * perPage;

  // Step 6: Build where condition (only fields in schema)
  const where: Record<string, any> = {
    shopping_mall_payment_id: props.paymentId,
  };
  if (created_from !== undefined && created_from !== null) {
    where.created_at = { ...where.created_at, gte: created_from };
  }
  if (created_to !== undefined && created_to !== null) {
    where.created_at = { ...where.created_at, lte: created_to };
  }

  // Step 7: Ordering
  const orderField = sort_by ?? "created_at";
  const orderDir = sort_order ?? "desc";
  // Step 8: Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_snapshots.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip,
      take: perPage,
    }),
    MyGlobal.prisma.shopping_mall_payment_snapshots.count({ where }),
  ]);

  // Step 9: Convert rows to IShoppingMallPaymentSnapshot[]
  const data = rows.map((x) => ({
    id: x.id,
    shopping_mall_payment_id: x.shopping_mall_payment_id,
    snapshot_data: x.snapshot_data,
    created_at: toISOStringSafe(x.created_at),
  }));

  // Step 10: Pagination info
  const pagination = {
    current: Number(currentPage),
    limit: Number(perPage),
    records: total,
    pages: Math.ceil(total / Number(perPage)),
  };
  // Step 11: Return data
  return {
    pagination,
    data,
  };
}
