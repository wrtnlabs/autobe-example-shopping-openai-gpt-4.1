import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.IRequest;
}): Promise<IPageIShoppingMallConfiguration> {
  const { body } = props;

  // Pagination and defaults
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const rawLimit =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 20;
  const limit =
    rawLimit > 100
      ? (() => {
          throw new HttpException("limit too large", 400);
        })()
      : rawLimit;

  if (page < 1) {
    throw new HttpException("Page must be >= 1", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be >= 1", 400);
  }

  // Sorting
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "revision",
    "key",
  ] as const;
  const allowedSortOrders = ["asc", "desc"] as const;
  const sort_by = allowedSortFields.includes(body.sort_by as any)
    ? body.sort_by
    : "created_at";
  const sort_order = allowedSortOrders.includes(body.sort_order as any)
    ? body.sort_order
    : "desc";

  // Where clause filters
  const where = {
    ...(body.shopping_mall_channel_id !== undefined &&
      body.shopping_mall_channel_id !== null && {
        shopping_mall_channel_id: body.shopping_mall_channel_id,
      }),
    ...(body.key !== undefined &&
      body.key.length > 0 && {
        key: { contains: body.key },
      }),
    ...(body.revision !== undefined && { revision: body.revision }),
    ...(body.description !== undefined &&
      body.description.length > 0 && {
        description: { contains: body.description },
      }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined && {
              gte: body.updated_at_from,
            }),
            ...(body.updated_at_to !== undefined && {
              lte: body.updated_at_to,
            }),
          },
        }
      : {}),
    ...(body.deleted === true ? {} : { deleted_at: null }),
  };

  const skip = (page - 1) * limit;

  // Prisma queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_configurations.findMany({
      where,
      orderBy: { [sort_by as string]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_configurations.count({ where }),
  ]);

  // Map results
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_channel_id: row.shopping_mall_channel_id ?? undefined,
    key: row.key,
    value: row.value,
    revision: row.revision,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at != null ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data,
  };
}
