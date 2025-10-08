import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";
import { IPageIShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallModerationEventLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminModerationEventLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallModerationEventLog.IRequest;
}): Promise<IPageIShoppingMallModerationEventLog.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Parse sort syntax: 'created_at:desc', 'event_type:asc', fallback to created_at:desc
  let orderByField = "created_at";
  let orderDir: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, dir] = body.sort.split(":");
    if (["created_at", "event_type", "moderation_message"].includes(field)) {
      orderByField = field;
      if (dir === "asc" || dir === "desc") orderDir = dir;
    }
  }

  // Build where filter per provided fields (skip null/undefined)
  const where = {
    ...(body.shopping_mall_admin_id !== undefined && {
      shopping_mall_admin_id: body.shopping_mall_admin_id,
    }),
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.affected_seller_id !== undefined && {
      affected_seller_id: body.affected_seller_id,
    }),
    ...(body.affected_product_id !== undefined && {
      affected_product_id: body.affected_product_id,
    }),
    ...(body.affected_review_id !== undefined && {
      affected_review_id: body.affected_review_id,
    }),
    ...(body.affected_order_id !== undefined && {
      affected_order_id: body.affected_order_id,
    }),
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined && { gte: body.created_from }),
        ...(body.created_to !== undefined && { lte: body.created_to }),
      },
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_moderation_event_logs.findMany({
      where,
      orderBy: { [orderByField]: orderDir },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        event_type: true,
        moderation_message: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_moderation_event_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_admin_id: row.shopping_mall_admin_id,
      event_type: row.event_type,
      moderation_message: row.moderation_message,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
