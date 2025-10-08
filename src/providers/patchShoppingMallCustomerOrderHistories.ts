import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { IPageIShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrderHistories(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderHistory.IRequest;
}): Promise<IPageIShoppingMallOrderHistory.ISummary> {
  const { customer, body } = props;

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Filtering conditions
  const where = {
    // Only histories of orders belonging to this customer
    order: {
      shopping_mall_customer_id: customer.id,
    },
    // Filter by snapshot_type
    ...(body.snapshot_type !== undefined && {
      snapshot_type: body.snapshot_type,
    }),
    // Filter by order_status
    ...(body.order_status !== undefined && { order_status: body.order_status }),
    // Filter by order_id
    ...(body.order_id !== undefined && {
      shopping_mall_order_id: body.order_id,
    }),
    // Filter by reason (contains, for partial match)
    ...(body.snapshot_reason !== undefined && {
      snapshot_reason: { contains: body.snapshot_reason },
    }),
    // Created_at range
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined && { gte: body.created_from }),
        ...(body.created_to !== undefined && { lte: body.created_to }),
      },
    }),
    // Only non-deleted
    deleted_at: null,
  };

  // Sorting
  const sort_by = body.sort_by ?? "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Query data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_histories.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_order_id: true,
        snapshot_type: true,
        order_status: true,
        order_total: true,
        snapshot_reason: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_histories.count({ where }),
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
      snapshot_type: row.snapshot_type,
      order_status: row.order_status,
      order_total: row.order_total,
      snapshot_reason: row.snapshot_reason ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
