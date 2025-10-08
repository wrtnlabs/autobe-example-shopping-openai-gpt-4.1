import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import { IPageIShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPaymentMethod";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrderPaymentMethods(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderPaymentMethod.IRequest;
}): Promise<IPageIShoppingMallOrderPaymentMethod.ISummary> {
  const body = props.body;

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    deleted_at: null,
    ...(body.payment_method_type !== undefined &&
      body.payment_method_type !== null && {
        payment_method_type: body.payment_method_type,
      }),
    ...(body.display_name !== undefined &&
      body.display_name !== null && {
        display_name: body.display_name,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Sorting
  const allowedSort = ["created_at", "payment_method_type", "display_name"];
  let sort_by =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  let sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Query and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_payment_methods.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
      select: {
        id: true,
        payment_method_type: true,
        display_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_payment_methods.count({ where }),
  ]);

  // Format result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      payment_method_type: row.payment_method_type,
      display_name: row.display_name,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
