import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAuditLog> {
  const { auditLogId } = props;

  // Find the audit log entry by ID
  const log = await MyGlobal.prisma.shopping_mall_audit_logs.findUnique({
    where: { id: auditLogId },
  });
  if (!log) throw new HttpException("Audit log not found", 404);

  return {
    id: log.id,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    event_type: log.event_type,
    actor_id: log.actor_id === null ? undefined : log.actor_id,
    snapshot_id: log.snapshot_id === null ? undefined : log.snapshot_id,
    event_result: log.event_result,
    event_message: log.event_message === null ? undefined : log.event_message,
    event_time: toISOStringSafe(log.event_time),
    created_at: toISOStringSafe(log.created_at),
  };
}
