import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDeletionEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeletionEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminDeletionEventsDeletionEventId(props: {
  admin: AdminPayload;
  deletionEventId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDeletionEvent> {
  const record = await MyGlobal.prisma.shopping_mall_deletion_events.findUnique(
    {
      where: { id: props.deletionEventId },
    },
  );

  if (!record) {
    throw new HttpException("Deletion event not found", 404);
  }

  return {
    id: record.id,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    deleted_by_id: record.deleted_by_id === null ? null : record.deleted_by_id,
    deletion_reason: record.deletion_reason,
    snapshot_id: record.snapshot_id === null ? null : record.snapshot_id,
    deleted_at: toISOStringSafe(record.deleted_at),
    created_at: toISOStringSafe(record.created_at),
  };
}
