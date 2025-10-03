import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeletionEvent";
import { IPageIShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeletionEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDeletionEvents(props: {
  admin: AdminPayload;
  body: IShoppingMallDeletionEvent.IRequest;
}): Promise<IPageIShoppingMallDeletionEvent> {
  const { body } = props;
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = ["deleted_at", "entity_type"];
  const sortField = allowedSortFields.includes(body.sort_field ?? "")
    ? body.sort_field!
    : "deleted_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build query conditions
  const where = {
    ...(body.entity_type !== undefined &&
      body.entity_type !== null && {
        entity_type: body.entity_type,
      }),
    ...(body.entity_id !== undefined &&
      body.entity_id !== null && {
        entity_id: body.entity_id,
      }),
    ...(body.deleted_by_id !== undefined &&
      body.deleted_by_id !== null && {
        deleted_by_id: body.deleted_by_id,
      }),
    ...(body.deletion_reason !== undefined &&
      body.deletion_reason !== null && {
        deletion_reason: { contains: body.deletion_reason },
      }),
    ...(body.snapshot_id !== undefined &&
      body.snapshot_id !== null && {
        snapshot_id: body.snapshot_id,
      }),
    ...((body.deleted_at_start !== undefined &&
      body.deleted_at_start !== null) ||
    (body.deleted_at_end !== undefined && body.deleted_at_end !== null)
      ? {
          deleted_at: {
            ...(body.deleted_at_start !== undefined &&
              body.deleted_at_start !== null && {
                gte: body.deleted_at_start,
              }),
            ...(body.deleted_at_end !== undefined &&
              body.deleted_at_end !== null && {
                lte: body.deleted_at_end,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_deletion_events.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_deletion_events.count({ where }),
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
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      deleted_by_id: row.deleted_by_id === null ? null : row.deleted_by_id,
      deletion_reason: row.deletion_reason,
      snapshot_id: row.snapshot_id === null ? null : row.snapshot_id,
      deleted_at: toISOStringSafe(row.deleted_at),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
