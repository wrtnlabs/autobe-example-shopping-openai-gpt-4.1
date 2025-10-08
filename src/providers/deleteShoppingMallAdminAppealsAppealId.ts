import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, appealId } = props;

  // 1. Fetch the appeal and check if already deleted
  const appeal = await MyGlobal.prisma.shopping_mall_appeals.findUnique({
    where: { id: appealId },
  });
  if (!appeal || appeal.deleted_at !== null) {
    throw new HttpException("Appeal not found", 404);
  }

  // 2. Ensure appeal is not in active status
  const nonDeletableStatuses = [
    "pending",
    "open",
    "under review",
    "under_review",
  ];
  if (nonDeletableStatuses.includes(appeal.appeal_status)) {
    throw new HttpException(
      "Appeal must be fully resolved before deletion",
      403,
    );
  }

  // 3. Fetch escalation (appeal.escalation_id)
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findUnique(
    {
      where: { id: appeal.escalation_id },
    },
  );
  if (!escalation || escalation.deleted_at !== null) {
    throw new HttpException("Parent escalation not found", 404);
  }
  const openEscalationStatuses = [
    "pending",
    "open",
    "in-review",
    "in_review",
    "escalated",
    "under_review",
    "under review",
  ];
  if (openEscalationStatuses.includes(escalation.escalation_status)) {
    throw new HttpException(
      "Cannot delete appeal tied to open escalation",
      403,
    );
  }

  // 4. Hard delete appeal
  await MyGlobal.prisma.shopping_mall_appeals.delete({
    where: { id: appealId },
  });

  // 5. Audit admin action log
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      affected_customer_id: appeal.appellant_customer_id ?? undefined,
      affected_seller_id: appeal.appellant_seller_id ?? undefined,
      action_type: "delete",
      action_reason: "Appeal permanently deleted by admin",
      domain: "appeal",
      details_json: JSON.stringify({
        pre_deleted_appeal: {
          ...appeal,
        },
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
