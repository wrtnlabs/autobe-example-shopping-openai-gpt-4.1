import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IShoppingMallAppeal.IUpdate;
}): Promise<IShoppingMallAppeal> {
  // Fetch the target appeal record
  const existing = await MyGlobal.prisma.shopping_mall_appeals.findUnique({
    where: { id: props.appealId },
  });
  if (!existing || existing.deleted_at) {
    throw new HttpException("Appeal not found", 404);
  }

  // Terminal statuses (non-updatable)
  const terminalStatuses = ["resolved", "dismissed", "accepted", "rejected"];
  if (terminalStatuses.includes(existing.appeal_status)) {
    throw new HttpException("Completed appeals cannot be updated", 409);
  }

  // Only allow update if not completed - update resolution_type/comment if provided
  const updated = await MyGlobal.prisma.shopping_mall_appeals.update({
    where: { id: props.appealId },
    data: {
      appeal_status: props.body.appeal_status,
      resolution_type: props.body.resolution_type ?? undefined,
      resolution_comment: props.body.resolution_comment ?? undefined,
      reviewing_admin_id: props.admin.id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    escalation_id: updated.escalation_id,
    appellant_customer_id: updated.appellant_customer_id ?? undefined,
    appellant_seller_id: updated.appellant_seller_id ?? undefined,
    reviewing_admin_id: updated.reviewing_admin_id ?? undefined,
    appeal_type: updated.appeal_type,
    appeal_status: updated.appeal_status,
    resolution_type: updated.resolution_type ?? undefined,
    resolution_comment: updated.resolution_comment ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
