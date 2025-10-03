import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntitySnapshot";
import { IPageIShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEntitySnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminEntitySnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallEntitySnapshot.IRequest;
}): Promise<IPageIShoppingMallEntitySnapshot> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Assemble event_time range filter (gte/lte)
  let eventTimeFilter: { gte?: string; lte?: string } = {};
  if (body.event_time_from !== undefined && body.event_time_from !== null) {
    eventTimeFilter.gte = body.event_time_from;
  }
  if (body.event_time_to !== undefined && body.event_time_to !== null) {
    eventTimeFilter.lte = body.event_time_to;
  }

  // Where filter
  const where = {
    ...(body.entity_type !== undefined &&
      body.entity_type !== null && { entity_type: body.entity_type }),
    ...(body.entity_id !== undefined &&
      body.entity_id !== null && { entity_id: body.entity_id }),
    ...(body.snapshot_reason !== undefined &&
      body.snapshot_reason !== null && {
        snapshot_reason: body.snapshot_reason,
      }),
    ...(body.snapshot_actor_id !== undefined &&
      body.snapshot_actor_id !== null && {
        snapshot_actor_id: body.snapshot_actor_id,
      }),
    ...(Object.keys(eventTimeFilter).length > 0 && {
      event_time: eventTimeFilter,
    }),
  };

  // Determine orderBy from sort expression (allow only literal strings, fallback safe default)
  let orderBy: any = { event_time: "desc" };
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const [field, direction] = body.sort.split(" ");
    if (["event_time", "created_at", "updated_at"].includes(field)) {
      orderBy = {
        [field]:
          direction && direction.toLowerCase() === "asc" ? "asc" : "desc",
      };
    }
  }

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_entity_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_entity_snapshots.count({ where }),
  ]);

  // Transform to API response
  const data = rows.map((row) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    snapshot_reason: row.snapshot_reason,
    snapshot_actor_id: row.snapshot_actor_id ?? undefined,
    snapshot_data: row.snapshot_data,
    event_time: toISOStringSafe(row.event_time),
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
