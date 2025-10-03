import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntitySnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminEntitySnapshotsEntitySnapshotId(props: {
  admin: AdminPayload;
  entitySnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallEntitySnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_entity_snapshots.findUnique({
      where: { id: props.entitySnapshotId },
    });

  if (!record) {
    throw new HttpException("EntitySnapshot not found", 404);
  }

  return {
    id: record.id,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    snapshot_reason: record.snapshot_reason,
    snapshot_actor_id: record.snapshot_actor_id ?? undefined,
    snapshot_data: record.snapshot_data,
    event_time: toISOStringSafe(record.event_time),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
