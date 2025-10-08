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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdStatusHistory(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { orderId, body } = props;

  // Pagination params
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Build WHERE condition based on optional filters
  const where: Record<string, any> = {
    shopping_mall_order_id: orderId,
    deleted_at: null,
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.status_before !== undefined && {
      status_before: body.status_before,
    }),
    ...(body.status_after !== undefined && { status_after: body.status_after }),
    ...(body.created_after !== undefined && {
      created_at: { gte: toISOStringSafe(body.created_after) },
    }),
    ...(body.created_before !== undefined && {
      created_at: { lte: toISOStringSafe(body.created_before) },
    }),
    // actor_role is not a DB field, requires mapping to actor_*_id is not null
  };

  // Handle actor_role. Must check if actor_customer_id (for customer), etc.
  if (body.actor_role === "customer") {
    where["actor_customer_id"] = { not: null };
  } else if (body.actor_role === "seller") {
    where["actor_seller_id"] = { not: null };
  } else if (body.actor_role === "admin") {
    where["actor_admin_id"] = { not: null };
  }

  // Sorting
  const sortField = body.sort ?? "created_at";
  const sortOrder = body.order ?? "desc";

  // Only allow valid sort fields
  const allowedSortFields = [
    "created_at",
    "event_type",
    "actor_role",
    "status_before",
    "status_after",
  ];
  const orderByField = allowedSortFields.includes(sortField)
    ? sortField
    : "created_at";

  // For actor_role sorting - cannot sort by mapped field, fallback to created_at
  const orderBy =
    orderByField === "actor_role"
      ? { created_at: sortOrder }
      : { [orderByField]: sortOrder };

  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({ where }),
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
      shopping_mall_order_id: row.shopping_mall_order_id,
      actor_customer_id: row.actor_customer_id ?? undefined,
      actor_seller_id: row.actor_seller_id ?? undefined,
      actor_admin_id: row.actor_admin_id ?? undefined,
      event_type: row.event_type,
      status_before: row.status_before ?? undefined,
      status_after: row.status_after ?? undefined,
      message: row.message ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
