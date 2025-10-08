import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const { admin, body } = props;
  if (!admin || admin.type !== "admin") {
    throw new HttpException(
      "Unauthorized: Only platform admins can access this resource",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.email !== undefined && {
      email: { contains: body.email },
    }),
    ...(body.full_name !== undefined && {
      full_name: { contains: body.full_name },
    }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.last_login_from !== undefined || body.last_login_to !== undefined
      ? {
          last_login_at: {
            ...(body.last_login_from !== undefined && {
              gte: body.last_login_from,
            }),
            ...(body.last_login_to !== undefined && {
              lte: body.last_login_to,
            }),
          },
        }
      : {}),
  };

  // Safe sort_by
  const allowedSortFields = ["created_at", "status", "full_name", "email"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        full_name: true,
        status: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
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
      email: row.email,
      full_name: row.full_name,
      status: row.status,
      last_login_at: row.last_login_at
        ? toISOStringSafe(row.last_login_at)
        : null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
