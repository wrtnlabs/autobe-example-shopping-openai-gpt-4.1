import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";
import { IPageIShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDepositTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDepositsDepositIdTransactions(props: {
  admin: AdminPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallDepositTransaction.IRequest;
}): Promise<IPageIShoppingMallDepositTransaction> {
  const { depositId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deposit_transactions.findMany({
      where: {
        shopping_mall_deposit_id: depositId,
        deleted_at: null,
        ...(body.business_status !== undefined && {
          business_status: body.business_status,
        }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.order_id !== undefined && {
          shopping_mall_order_id: body.order_id,
        }),
        ...((body.start_date !== undefined || body.end_date !== undefined) && {
          created_at: {
            ...(body.start_date !== undefined && { gte: body.start_date }),
            ...(body.end_date !== undefined && { lt: body.end_date }),
          },
        }),
        ...(body.reason !== undefined &&
          body.reason !== null &&
          body.reason !== "" && {
            reason: {
              contains: body.reason,
            },
          }),
      },
      orderBy: {
        created_at: body.sort === "created_at:asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deposit_transactions.count({
      where: {
        shopping_mall_deposit_id: depositId,
        deleted_at: null,
        ...(body.business_status !== undefined && {
          business_status: body.business_status,
        }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.order_id !== undefined && {
          shopping_mall_order_id: body.order_id,
        }),
        ...((body.start_date !== undefined || body.end_date !== undefined) && {
          created_at: {
            ...(body.start_date !== undefined && { gte: body.start_date }),
            ...(body.end_date !== undefined && { lt: body.end_date }),
          },
        }),
        ...(body.reason !== undefined &&
          body.reason !== null &&
          body.reason !== "" && {
            reason: {
              contains: body.reason,
            },
          }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_deposit_id: row.shopping_mall_deposit_id,
      shopping_mall_customer_id: row.shopping_mall_customer_id,
      shopping_mall_order_id: row.shopping_mall_order_id ?? undefined,
      type: row.type,
      amount: row.amount,
      business_status: row.business_status,
      reason: row.reason ?? undefined,
      evidence_reference: row.evidence_reference ?? undefined,
      reversed_at: row.reversed_at
        ? toISOStringSafe(row.reversed_at)
        : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
