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
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Filtering logic
  const where = {
    ...(body.shopping_mall_channel_id !== undefined &&
      body.shopping_mall_channel_id !== null && {
        shopping_mall_channel_id: body.shopping_mall_channel_id,
      }),
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.kyc_status !== undefined &&
      body.kyc_status !== null && {
        kyc_status: body.kyc_status,
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && { gte: body.created_after }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && { lte: body.created_before }),
          },
        }
      : {}),
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : body.deleted === false
        ? { deleted_at: null }
        : {}),
  };

  // Sorting: parse 'sort' string like 'created_at desc' or 'name asc'
  let orderBy: Record<string, "asc" | "desc">[] = [{ created_at: "desc" }];
  if (body.sort && typeof body.sort === "string") {
    orderBy = body.sort.split(",").map((s) => {
      const [field, dir] = s.trim().split(/\s+/);
      if (
        [
          "created_at",
          "updated_at",
          "name",
          "email",
          "status",
          "kyc_status",
        ].includes(field)
      ) {
        return {
          [field]: dir && dir.toLowerCase() === "asc" ? "asc" : "desc",
        };
      }
      return { created_at: "desc" };
    });
  }

  // Query + total count: always inline
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_channel_id: true,
        email: true,
        name: true,
        status: true,
        kyc_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  // Transform rows to ISummary
  const data: IShoppingMallCustomer.ISummary[] = rows.map((row) => ({
    id: row.id,
    shopping_mall_channel_id: row.shopping_mall_channel_id,
    email: row.email,
    name: row.name,
    status: row.status,
    kyc_status: row.kyc_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
