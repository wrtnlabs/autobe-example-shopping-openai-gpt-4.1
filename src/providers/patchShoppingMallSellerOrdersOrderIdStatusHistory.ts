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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdStatusHistory(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  // 1. Confirm order exists and belongs to seller
  const orderCheck = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (!orderCheck) {
    throw new HttpException(
      "Order not found or you do not have access to this order",
      403,
    );
  }

  // 2. Pagination: sanitize
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  // 3. Build where filter for status history
  const where: any = {
    shopping_mall_order_id: props.orderId,
  };
  if (props.body.event_type !== undefined) {
    where.event_type = props.body.event_type;
  }
  if (props.body.status_before !== undefined) {
    where.status_before = props.body.status_before;
  }
  if (props.body.status_after !== undefined) {
    where.status_after = props.body.status_after;
  }
  if (props.body.created_after !== undefined) {
    where.created_at = where.created_at || {};
    where.created_at.gte = props.body.created_after;
  }
  if (props.body.created_before !== undefined) {
    where.created_at = where.created_at || {};
    where.created_at.lte = props.body.created_before;
  }
  // actor_role mapping
  if (props.body.actor_role === "customer") {
    where.actor_customer_id = { not: null };
  } else if (props.body.actor_role === "seller") {
    where.actor_seller_id = { not: null };
  } else if (props.body.actor_role === "admin") {
    where.actor_admin_id = { not: null };
  }

  // 4. Sorting logic (default created_at desc)
  const allowedSorts = [
    "created_at",
    "event_type",
    "actor_role",
    "status_before",
    "status_after",
  ];
  const sort =
    props.body.sort && allowedSorts.includes(props.body.sort)
      ? props.body.sort
      : "created_at";
  const orderDir =
    props.body.order === "asc" || props.body.order === "desc"
      ? props.body.order
      : "desc";

  // 5. Query data and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where,
      orderBy: { [sort]: orderDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({ where }),
  ]);

  // 6. Map rows to DTOs, handling dates and optional fields
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    actor_customer_id:
      row.actor_customer_id === undefined ? undefined : row.actor_customer_id,
    actor_seller_id:
      row.actor_seller_id === undefined ? undefined : row.actor_seller_id,
    actor_admin_id:
      row.actor_admin_id === undefined ? undefined : row.actor_admin_id,
    event_type: row.event_type,
    status_before:
      row.status_before === undefined ? undefined : row.status_before,
    status_after: row.status_after === undefined ? undefined : row.status_after,
    message: row.message === undefined ? undefined : row.message,
    created_at: toISOStringSafe(row.created_at),
  }));

  // 7. Pagination result
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
