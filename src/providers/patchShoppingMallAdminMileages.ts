import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { IPageIShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminMileages(props: {
  admin: AdminPayload;
  body: IShoppingMallMileage.IRequest;
}): Promise<IPageIShoppingMallMileage.ISummary> {
  const body = props.body;
  // Pagination defaults
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.min_balance !== undefined && {
      balance: { gte: body.min_balance },
    }),
    ...(body.max_balance !== undefined && {
      balance: {
        ...(body.min_balance !== undefined ? { gte: body.min_balance } : {}),
        lte: body.max_balance,
      },
    }),
    ...(body.expired_before !== undefined && {
      expired_at: { lte: body.expired_before },
    }),
    ...(body.expired_after !== undefined && {
      expired_at: {
        ...(body.expired_before !== undefined
          ? { lte: body.expired_before }
          : {}),
        gte: body.expired_after,
      },
    }),
    ...(body.customer_id !== undefined && {
      shopping_mall_customer_id: body.customer_id,
    }),
  };
  // Note: Prisma merges multiple objects for a field into AND conditions.
  // We need to carefully merge balance/expired_at conditions.

  // Merge expired_at conditions
  let expiredAt: Record<string, string> = {};
  if (body.expired_before !== undefined) expiredAt.lte = body.expired_before;
  if (body.expired_after !== undefined) expiredAt.gte = body.expired_after;

  // Merge balance conditions
  let balanceCond: Record<string, number> = {};
  if (body.min_balance !== undefined) balanceCond.gte = body.min_balance;
  if (body.max_balance !== undefined) balanceCond.lte = body.max_balance;

  const finalWhere: Record<string, any> = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.customer_id !== undefined && {
      shopping_mall_customer_id: body.customer_id,
    }),
    ...(Object.keys(balanceCond).length > 0 && { balance: balanceCond }),
    ...(Object.keys(expiredAt).length > 0 && { expired_at: expiredAt }),
  };

  const [rows, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_mileages.findMany({
      where: finalWhere,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_mileages.count({
      where: finalWhere,
    }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_customer_id: row.shopping_mall_customer_id,
      balance: row.balance,
      status: row.status,
      expired_at:
        row.expired_at == null ? null : toISOStringSafe(row.expired_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
