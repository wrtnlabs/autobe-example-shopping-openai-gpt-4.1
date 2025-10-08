import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const body = props.body;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.email_verified !== undefined &&
      body.email_verified !== null && { email_verified: body.email_verified }),
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
    ...((body.updated_from !== undefined && body.updated_from !== null) ||
    (body.updated_to !== undefined && body.updated_to !== null)
      ? {
          updated_at: {
            ...(body.updated_from !== undefined &&
              body.updated_from !== null && { gte: body.updated_from }),
            ...(body.updated_to !== undefined &&
              body.updated_to !== null && { lte: body.updated_to }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
      ? {
          OR: [
            { email: { contains: body.search } },
            { full_name: { contains: body.search } },
            { phone: { contains: body.search } },
          ],
        }
      : {}),
  };

  const allowedSorts = ["created_at", "updated_at", "email"];
  let sortField = "created_at";
  if (
    body.sort !== undefined &&
    body.sort !== null &&
    allowedSorts.includes(body.sort)
  ) {
    sortField = body.sort;
  }
  let sortOrder: "asc" | "desc" = "desc";
  if (body.order === "asc" || body.order === "desc") {
    sortOrder = body.order;
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        email_verified: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      status: row.status,
      email_verified: row.email_verified,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
