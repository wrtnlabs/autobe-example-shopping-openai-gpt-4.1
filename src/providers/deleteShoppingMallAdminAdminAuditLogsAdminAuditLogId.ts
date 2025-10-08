import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminAuditLogsAdminAuditLogId(props: {
  admin: AdminPayload;
  adminAuditLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if log exists
  const log = await MyGlobal.prisma.shopping_mall_admin_action_logs.findUnique({
    where: { id: props.adminAuditLogId },
  });
  if (!log) {
    throw new HttpException("Log entry not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_admin_action_logs.delete({
    where: { id: props.adminAuditLogId },
  });
}
