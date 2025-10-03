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

export async function putShoppingMallAdminAdminsAdminIdRoleEscalationsEscalationId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  escalationId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminRoleEscalation.IUpdate;
}): Promise<IShoppingMallAdminRoleEscalation> {
  const { admin, adminId, escalationId, body } = props;

  // Fetch escalation
  const escalation =
    await MyGlobal.prisma.shopping_mall_admin_role_escalations.findUnique({
      where: { id: escalationId },
    });
  if (!escalation || escalation.shopping_mall_admin_id !== adminId) {
    throw new HttpException(
      "Escalation not found or does not belong to the given adminId",
      404,
    );
  }

  // Authorization: Only privileged admins can update (must match context admin?)
  // If further restriction needed (e.g., only reviewer or original admin), expand logic here.
  const actingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: admin.id, deleted_at: null, status: "active" },
  });
  if (!actingAdmin) {
    throw new HttpException(
      "Unauthorized: Only active admins can update role escalations",
      403,
    );
  }

  // Business rule: allowed transitions
  const terminal = ["approved", "rejected", "cancelled"];
  if (terminal.includes(escalation.status)) {
    throw new HttpException(
      "Cannot update escalation: status is already finalized",
      400,
    );
  }

  if (escalation.status === body.status) {
    throw new HttpException(
      "No status change: escalation already in this status",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  // Only update status, reviewed_by_id, reason, and updated_at
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_role_escalations.update({
      where: { id: escalationId },
      data: {
        status: body.status,
        reviewed_by_id: body.reviewed_by_id ?? null,
        reason: body.reason ?? null,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    shopping_mall_admin_id: updated.shopping_mall_admin_id,
    requestor_id: updated.requestor_id,
    escalation_type: updated.escalation_type,
    status: updated.status,
    reviewed_by_id: updated.reviewed_by_id ?? undefined,
    reason: updated.reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
