import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdStatusHistory(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { customer, orderId, body } = props;
  // 1. Verify order ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // 2. Pagination/defaults
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // 3. Build where
  const where: Record<string, any> = {
    shopping_mall_order_id: orderId,
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.status_after !== undefined && { status_after: body.status_after }),
    ...(body.status_before !== undefined && {
      status_before: body.status_before,
    }),
    ...((body.created_after !== undefined ||
      body.created_before !== undefined) && {
      created_at: {
        ...(body.created_after !== undefined && { gte: body.created_after }),
        ...(body.created_before !== undefined && { lte: body.created_before }),
      },
    }),
  };

  if (body.actor_role === "customer") {
    where.actor_customer_id = { not: null };
  } else if (body.actor_role === "seller") {
    where.actor_seller_id = { not: null };
  } else if (body.actor_role === "admin") {
    where.actor_admin_id = { not: null };
  }

  // 4. Sort
  let orderBy: Record<string, "asc" | "desc">;
  switch (body.sort) {
    case "event_type":
      orderBy = { event_type: body.order === "asc" ? "asc" : "desc" };
      break;
    case "status_before":
      orderBy = { status_before: body.order === "asc" ? "asc" : "desc" };
      break;
    case "status_after":
      orderBy = { status_after: body.order === "asc" ? "asc" : "desc" };
      break;
    default:
      orderBy = { created_at: body.order === "asc" ? "asc" : "desc" };
  }

  // 5. Data fetch
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        actor_customer_id: true,
        actor_seller_id: true,
        actor_admin_id: true,
        event_type: true,
        status_before: true,
        status_after: true,
        message: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    actor_customer_id: row.actor_customer_id ?? undefined,
    actor_seller_id: row.actor_seller_id ?? undefined,
    actor_admin_id: row.actor_admin_id ?? undefined,
    event_type: row.event_type,
    status_before: row.status_before ?? undefined,
    status_after: row.status_after ?? undefined,
    message: row.message ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
