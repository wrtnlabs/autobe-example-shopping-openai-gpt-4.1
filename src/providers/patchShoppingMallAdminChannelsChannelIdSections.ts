import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannelsChannelIdSections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallSection.IRequest;
}): Promise<IPageIShoppingMallSection.ISummary> {
  // Check channel existence
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.channelId },
    select: { id: true },
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Pagination numbers
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Dynamic where clause with all schema-verified filters
  const where = {
    shopping_mall_channel_id: props.channelId,
    ...(props.body.status === "deleted"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(props.body.name !== undefined &&
      props.body.name !== null &&
      props.body.name !== "" && {
        name: { contains: props.body.name },
      }),
    ...(props.body.code !== undefined &&
      props.body.code !== null &&
      props.body.code !== "" && {
        code: { contains: props.body.code },
      }),
    ...(props.body.display_order !== undefined &&
      props.body.display_order !== null && {
        display_order: props.body.display_order,
      }),
    ...(props.body.created_at_start || props.body.created_at_end
      ? {
          created_at: {
            ...(props.body.created_at_start && {
              gte: props.body.created_at_start,
            }),
            ...(props.body.created_at_end && {
              lte: props.body.created_at_end,
            }),
          },
        }
      : {}),
    ...(props.body.updated_at_start || props.body.updated_at_end
      ? {
          updated_at: {
            ...(props.body.updated_at_start && {
              gte: props.body.updated_at_start,
            }),
            ...(props.body.updated_at_end && {
              lte: props.body.updated_at_end,
            }),
          },
        }
      : {}),
  };

  // Sorting
  let orderBy: Record<string, Prisma.SortOrder> = { display_order: "asc" };
  if (props.body.sort) {
    const allowedSorts = ["display_order", "created_at", "name"];
    const field = allowedSorts.includes(props.body.sort)
      ? props.body.sort
      : "display_order";
    orderBy = {
      [field]: props.body.order === "desc" ? "desc" : "asc",
    } as Record<string, Prisma.SortOrder>;
  }

  // Find and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sections.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sections.count({ where }),
  ]);

  const data = rows.map((row) => {
    const result: IShoppingMallSection.ISummary = {
      id: row.id,
      shopping_mall_channel_id: row.shopping_mall_channel_id,
      code: row.code,
      name: row.name,
      description: row.description !== null ? row.description : undefined,
      display_order: row.display_order,
    };
    return result;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
