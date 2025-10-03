import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminIdRoleEscalationsEscalationId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  escalationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve escalation strictly by both escalationId and adminId.
  const escalation =
    await MyGlobal.prisma.shopping_mall_admin_role_escalations.findFirst({
      where: {
        id: props.escalationId,
        shopping_mall_admin_id: props.adminId,
      },
    });
  if (!escalation) {
    throw new HttpException("Escalation not found", 404);
  }
  // Hard delete (no soft delete field)
  await MyGlobal.prisma.shopping_mall_admin_role_escalations.delete({
    where: { id: props.escalationId },
  });
}
