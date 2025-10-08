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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrderHistories(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderHistory.IRequest;
}): Promise<IPageIShoppingMallOrderHistory.ISummary> {
  const { seller, body } = props;

  // 1. Find all order ids belonging to this seller
  const sellerOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const orderIds = sellerOrders.map((o) => o.id);
  if (orderIds.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // 2. Build filtering conditions
  let baseWhere: any = {
    shopping_mall_order_id: { in: orderIds },
    ...(body.snapshot_type !== undefined && {
      snapshot_type: body.snapshot_type,
    }),
    ...(body.order_status !== undefined && { order_status: body.order_status }),
    ...(body.order_id !== undefined && {
      shopping_mall_order_id: body.order_id,
    }),
    ...(body.created_from !== undefined && {
      created_at: { gte: body.created_from },
    }),
    ...(body.snapshot_reason !== undefined && {
      snapshot_reason: { contains: body.snapshot_reason },
    }),
  };
  if (body.created_to !== undefined) {
    if (baseWhere.created_at) {
      baseWhere.created_at = { ...baseWhere.created_at, lte: body.created_to };
    } else {
      baseWhere.created_at = { lte: body.created_to };
    }
  }
  const where = baseWhere;

  // 3. Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // 4. Sorting
  const sortField = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  // 5. Query total count
  const total = await MyGlobal.prisma.shopping_mall_order_histories.count({
    where,
  });
  // 6. Query data
  const rows = await MyGlobal.prisma.shopping_mall_order_histories.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
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
  });

  // 7. Map to ISummary[]
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

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
