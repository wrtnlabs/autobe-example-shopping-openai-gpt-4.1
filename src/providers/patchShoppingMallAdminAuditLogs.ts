import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAuditLog.IRequest;
}): Promise<IPageIShoppingMallAuditLog> {
  const body = props.body;
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    body.limit ?? (20 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause
  const where = {
    ...(body.entity_type !== undefined && {
      entity_type: body.entity_type,
    }),
    ...(body.entity_id !== undefined && {
      entity_id: body.entity_id,
    }),
    ...(body.event_type !== undefined && {
      event_type: body.event_type,
    }),
    ...(body.actor_id !== undefined && {
      actor_id: body.actor_id,
    }),
    ...(body.event_result !== undefined && {
      event_result: body.event_result,
    }),
    ...(body.event_time_from !== undefined || body.event_time_to !== undefined
      ? {
          event_time: {
            ...(body.event_time_from !== undefined && {
              gte: body.event_time_from,
            }),
            ...(body.event_time_to !== undefined && {
              lte: body.event_time_to,
            }),
          },
        }
      : {}),
    ...(body.snapshot_id !== undefined && {
      snapshot_id: body.snapshot_id,
    }),
    ...(body.event_message !== undefined && {
      event_message: {
        contains: body.event_message,
      },
    }),
  };

  // Sort parsing
  let orderBy: { [key: string]: "asc" | "desc" } = { event_time: "desc" };
  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    if (parts.length === 2 && (parts[1] === "asc" || parts[1] === "desc")) {
      orderBy = { [parts[0]]: parts[1] as "asc" | "desc" };
    } else if (parts.length === 1) {
      orderBy = { [parts[0]]: "desc" };
    }
  }

  // Query paginated data and total count parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_audit_logs.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_audit_logs.count({ where }),
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
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      event_type: row.event_type,
      actor_id: row.actor_id ?? undefined,
      snapshot_id: row.snapshot_id ?? undefined,
      event_result: row.event_result,
      event_message: row.event_message ?? undefined,
      event_time: toISOStringSafe(row.event_time),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
