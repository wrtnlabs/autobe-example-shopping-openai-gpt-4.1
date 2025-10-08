import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminAuditLogsAdminAuditLogId(props: {
  admin: AdminPayload;
  adminAuditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminAuditLog> {
  const record = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findFirst(
    {
      where: {
        id: props.adminAuditLogId,
        // deleted_at: null, // Field does not exist in schema
      },
      select: {
        id: true,
        shopping_mall_admin_id: true,
        audit_event_type: true,
        domain: true,
        event_context_json: true,
        log_level: true,
        created_at: true,
      },
    },
  );
  if (!record) {
    throw new HttpException("Admin audit log not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_admin_id: record.shopping_mall_admin_id,
    audit_event_type: record.audit_event_type,
    domain: record.domain,
    event_context_json: record.event_context_json ?? undefined,
    log_level: record.log_level,
    created_at: toISOStringSafe(record.created_at),
  };
}
