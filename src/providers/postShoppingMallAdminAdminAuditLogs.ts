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

export async function postShoppingMallAdminAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAuditLog.ICreate;
}): Promise<IShoppingMallAdminAuditLog> {
  if (props.body.shopping_mall_admin_id !== props.admin.id) {
    throw new HttpException("Forbidden: Admin ID mismatch", 403);
  }
  const created_at = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.body.shopping_mall_admin_id,
      audit_event_type: props.body.audit_event_type,
      domain: props.body.domain,
      event_context_json: props.body.event_context_json ?? undefined,
      log_level: props.body.log_level,
      created_at,
    },
  });
  return {
    id: created.id,
    shopping_mall_admin_id: created.shopping_mall_admin_id,
    audit_event_type: created.audit_event_type,
    domain: created.domain,
    event_context_json: created.event_context_json ?? undefined,
    log_level: created.log_level,
    created_at: toISOStringSafe(created.created_at),
  };
}
