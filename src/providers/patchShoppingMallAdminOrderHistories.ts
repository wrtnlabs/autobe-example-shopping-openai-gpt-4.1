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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrderHistories(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderHistory.IRequest;
}): Promise<IPageIShoppingMallOrderHistory.ISummary> {
  const {
    snapshot_type,
    order_status,
    created_from,
    created_to,
    order_id,
    snapshot_reason,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  // Pagination defaults (no type assertion)
  const pageValue = page ?? 1;
  const limitValue = limit ?? 20;
  const skip = (pageValue - 1) * limitValue;

  // Order by config
  const orderByField = sort_by || "created_at";
  const orderByDirection: "asc" | "desc" =
    sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_histories.findMany({
      where: {
        deleted_at: null,
        ...(snapshot_type && { snapshot_type }),
        ...(order_status && { order_status }),
        ...(order_id && { shopping_mall_order_id: order_id }),
        ...((created_from || created_to) && {
          created_at: {
            ...(created_from && { gte: created_from }),
            ...(created_to && { lte: created_to }),
          },
        }),
        ...(snapshot_reason && {
          snapshot_reason: { contains: snapshot_reason },
        }),
      },
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limitValue,
    }),
    MyGlobal.prisma.shopping_mall_order_histories.count({
      where: {
        deleted_at: null,
        ...(snapshot_type && { snapshot_type }),
        ...(order_status && { order_status }),
        ...(order_id && { shopping_mall_order_id: order_id }),
        ...((created_from || created_to) && {
          created_at: {
            ...(created_from && { gte: created_from }),
            ...(created_to && { lte: created_to }),
          },
        }),
        ...(snapshot_reason && {
          snapshot_reason: { contains: snapshot_reason },
        }),
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_order_id: row.shopping_mall_order_id,
    snapshot_type: row.snapshot_type,
    order_status: row.order_status,
    order_total: row.order_total,
    snapshot_reason: row.snapshot_reason ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  const pagination = {
    current: pageValue,
    limit: limitValue,
    records: total,
    pages: Math.ceil(total / limitValue),
  };

  return { pagination, data };
}
