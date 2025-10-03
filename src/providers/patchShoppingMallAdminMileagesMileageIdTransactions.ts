import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { IPageIShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileageTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminMileagesMileageIdTransactions(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileageTransaction.IRequest;
}): Promise<IPageIShoppingMallMileageTransaction> {
  const { mileageId, body } = props;

  // Pagination default logic
  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Build where clause (schema: strip null/undefined for required fields)
  const where = {
    shopping_mall_mileage_id: mileageId,
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null &&
      body.reason !== "" && { reason: { contains: body.reason } }),
    ...(body.shopping_mall_order_id !== undefined &&
      body.shopping_mall_order_id !== null && {
        shopping_mall_order_id: body.shopping_mall_order_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // orderBy: only Prisma-compatible fields, safe default is by created_at desc
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort_by !== undefined && body.sort_by !== null) {
    orderBy = {
      [body.sort_by]:
        body.sort_order !== undefined && body.sort_order !== null
          ? body.sort_order
          : "desc",
    };
  } else if (body.sort_order !== undefined && body.sort_order !== null) {
    orderBy = { created_at: body.sort_order };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_mileage_transactions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_mileage_transactions.count({ where }),
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
      shopping_mall_mileage_id: row.shopping_mall_mileage_id,
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
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
