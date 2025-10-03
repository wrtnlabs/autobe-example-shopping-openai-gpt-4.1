import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel.ISummary> {
  const { page = 1, limit = 20, search, code, name, description } = props.body;

  const skip = (page - 1) * limit;
  const take = limit;

  // Build the where condition based on params
  const where: Record<string, any> = {
    deleted_at: null,
    ...(code !== undefined && { code }),
    ...(name !== undefined && { name: { contains: name } }),
    ...(description !== undefined && {
      description: { contains: description },
    }),
  };

  if (search !== undefined && search !== null && search.trim().length > 0) {
    where.OR = [
      { code: { contains: search } },
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channels.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_channels.count({ where }),
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
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
