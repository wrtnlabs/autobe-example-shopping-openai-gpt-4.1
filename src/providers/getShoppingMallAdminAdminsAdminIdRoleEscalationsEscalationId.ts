import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleEscalation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsAdminIdRoleEscalationsEscalationId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  escalationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminRoleEscalation> {
  const { admin, adminId, escalationId } = props;

  // Find the escalation request for the given adminId and escalationId
  const escalation =
    await MyGlobal.prisma.shopping_mall_admin_role_escalations.findFirst({
      where: {
        id: escalationId,
        shopping_mall_admin_id: adminId,
      },
    });

  if (!escalation) {
    throw new HttpException("Role escalation request not found", 404);
  }

  // Authorization: only allow the owner admin to access
  if (escalation.shopping_mall_admin_id !== admin.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this escalation request",
      403,
    );
  }

  return {
    id: escalation.id,
    shopping_mall_admin_id: escalation.shopping_mall_admin_id,
    requestor_id: escalation.requestor_id,
    escalation_type: escalation.escalation_type,
    status: escalation.status,
    // reviewed_by_id and reason are nullable, mapped according to DTO
    reviewed_by_id: escalation.reviewed_by_id ?? undefined,
    reason: escalation.reason ?? undefined,
    created_at: toISOStringSafe(escalation.created_at),
    updated_at: toISOStringSafe(escalation.updated_at),
  };
}
