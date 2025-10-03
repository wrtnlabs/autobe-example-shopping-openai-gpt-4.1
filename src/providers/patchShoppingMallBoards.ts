import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import { IPageIShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBoard";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallBoards(props: {
  body: IShoppingMallBoard.IRequest;
}): Promise<IPageIShoppingMallBoard.ISummary> {
  const body = props.body;

  // Pagination defaults
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // Sorting: whitelist sort fields
  const allowedSortFields = ["created_at", "title", "display_order"];
  const sortFieldRaw = (body.sort_by || "").replace(/^[-+]/, "");
  const sortField = allowedSortFields.includes(sortFieldRaw)
    ? sortFieldRaw
    : "created_at";
  const sortOrder: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  // WHERE
  const where: Record<string, any> = {
    // Always exclude soft-deleted unless deleted==true
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(body.shopping_mall_channel_id !== undefined &&
      body.shopping_mall_channel_id !== null && {
        shopping_mall_channel_id: body.shopping_mall_channel_id,
      }),
    ...(body.shopping_mall_section_id !== undefined &&
      body.shopping_mall_section_id !== null && {
        shopping_mall_section_id: body.shopping_mall_section_id,
      }),
    ...(body.visibility !== undefined &&
      body.visibility !== null && {
        visibility: body.visibility,
      }),
    ...(body.moderation_required !== undefined &&
      body.moderation_required !== null && {
        moderation_required: body.moderation_required,
      }),
    ...(body.title !== undefined &&
      body.title !== null && {
        title: { contains: body.title }, // Always case-sensitive for full SQLite compatibility
      }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // Query DB in parallel for efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_boards.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_boards.count({ where }),
  ]);

  // Map to IShoppingMallBoard.ISummary
  const data = rows.map((row) => {
    return {
      id: row.id,
      shopping_mall_channel_id: row.shopping_mall_channel_id,
      shopping_mall_section_id:
        row.shopping_mall_section_id === null
          ? null
          : row.shopping_mall_section_id,
      title: row.title,
      description:
        row.description === undefined || row.description === null
          ? undefined
          : row.description,
      visibility: row.visibility,
      moderation_required: row.moderation_required,
      post_expiry_days:
        row.post_expiry_days === undefined || row.post_expiry_days === null
          ? undefined
          : row.post_expiry_days,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === undefined || row.deleted_at === null
          ? undefined
          : toISOStringSafe(row.deleted_at),
    };
  });

  const pageTotal = total;
  const pageCount = Math.ceil(pageTotal / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: pageTotal,
      pages: pageCount,
    },
    data,
  };
}
