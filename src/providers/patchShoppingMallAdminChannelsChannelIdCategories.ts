import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannelsChannelIdCategories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallChannelCategory.IRequest;
}): Promise<IPageIShoppingMallChannelCategory.ISummary> {
  // Check that channel exists and is not deleted
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      id: props.channelId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Extract and validate pagination
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    shopping_mall_channel_id: props.channelId,
    deleted_at: null,
    ...(props.body.parent_id !== null &&
      props.body.parent_id !== undefined && {
        parent_id: props.body.parent_id,
      }),
    ...(props.body.code && { code: props.body.code }),
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.status &&
      {
        /* status is not in schema, thus ignored */
      }),
    // Search (applies to name or description)
    ...(props.body.search && props.body.search.trim()
      ? {
          OR: [
            { name: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  // Allowed sorting fields
  const allowedSort: Record<string, true> = {
    created_at: true,
    name: true,
    display_order: true,
  };
  const sortBy =
    props.body.sortBy && allowedSort[props.body.sortBy]
      ? props.body.sortBy
      : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channel_categories.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_channel_id: true,
        parent_id: true,
        code: true,
        name: true,
        description: true,
        display_order: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_channel_categories.count({
      where,
    }),
  ]);

  // Format result to ISummary
  const data = rows.map((row) => {
    // parent_id: optional + nullable
    const obj: IShoppingMallChannelCategory.ISummary = {
      id: row.id,
      shopping_mall_channel_id: row.shopping_mall_channel_id,
      code: row.code,
      name: row.name,
      display_order: row.display_order,
    };
    if ("parent_id" in row) {
      obj.parent_id = row.parent_id;
    }
    if ("description" in row) {
      obj.description = row.description ?? undefined;
    }
    return obj;
  });

  const result: IPageIShoppingMallChannelCategory.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
  return result;
}
