import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import { IPageIShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallRole.IRequest;
}): Promise<IPageIShoppingMallRole> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where = {
    ...(body.role_name !== undefined &&
      body.role_name !== null &&
      body.role_name.length > 0 && {
        role_name: {
          contains: body.role_name,
        },
      }),
    ...(body.description !== undefined &&
      body.description !== null &&
      body.description.length > 0 && {
        description: {
          contains: body.description,
        },
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
  };

  const orderBy =
    body.order_by !== undefined && body.order_by !== null
      ? [
          {
            [body.order_by]: (body.order_direction === "asc"
              ? "asc"
              : "desc") satisfies "asc" | "desc" as "asc" | "desc",
          },
        ]
      : [{ created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" }];

  const skip = (page - 1) * limit;
  const take = limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_roles.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        role_name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_roles.count({
      where,
    }),
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
      role_name: row.role_name,
      description: row.description,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
