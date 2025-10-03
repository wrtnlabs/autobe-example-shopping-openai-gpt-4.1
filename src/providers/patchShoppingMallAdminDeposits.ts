import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import { IPageIShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeposit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDeposits(props: {
  admin: AdminPayload;
  body: IShoppingMallDeposit.IRequest;
}): Promise<IPageIShoppingMallDeposit.ISummary> {
  const {
    status,
    min_balance,
    max_balance,
    shopping_mall_customer_id,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page,
    limit,
  } = props.body;

  // Ensure all date ranges are consolidated for Prisma
  const createdAtCond =
    typeof created_from === "string" || typeof created_to === "string"
      ? {
          ...(typeof created_from === "string" ? { gte: created_from } : {}),
          ...(typeof created_to === "string" ? { lte: created_to } : {}),
        }
      : undefined;
  const updatedAtCond =
    typeof updated_from === "string" || typeof updated_to === "string"
      ? {
          ...(typeof updated_from === "string" ? { gte: updated_from } : {}),
          ...(typeof updated_to === "string" ? { lte: updated_to } : {}),
        }
      : undefined;

  const where = {
    deleted_at: null,
    ...(typeof status === "string" ? { status } : {}),
    ...(typeof min_balance === "number" || typeof max_balance === "number"
      ? {
          balance: {
            ...(typeof min_balance === "number" ? { gte: min_balance } : {}),
            ...(typeof max_balance === "number" ? { lte: max_balance } : {}),
          },
        }
      : {}),
    ...(typeof shopping_mall_customer_id === "string"
      ? { shopping_mall_customer_id }
      : {}),
    ...(createdAtCond ? { created_at: createdAtCond } : {}),
    ...(updatedAtCond ? { updated_at: updatedAtCond } : {}),
  };

  const pageNum = typeof page === "number" && page >= 1 ? page : 1;
  const limitNum = typeof limit === "number" && limit >= 1 ? limit : 20;
  const offset = (pageNum - 1) * limitNum;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deposits.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limitNum,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        balance: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_deposits.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limitNum)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_customer_id: row.shopping_mall_customer_id,
      balance: row.balance,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
