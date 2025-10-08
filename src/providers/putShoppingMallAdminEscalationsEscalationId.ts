import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminEscalationsEscalationId(props: {
  admin: AdminPayload;
  escalationId: string & tags.Format<"uuid">;
  body: IShoppingMallEscalation.IUpdate;
}): Promise<IShoppingMallEscalation> {
  const now = toISOStringSafe(new Date());
  // 1. Fetch escalation for update
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findUnique(
    {
      where: { id: props.escalationId },
    },
  );
  if (!escalation) {
    throw new HttpException("Escalation not found", 404);
  }
  // 2. Update with fields from body (skip missing)
  const updated = await MyGlobal.prisma.shopping_mall_escalations.update({
    where: { id: props.escalationId },
    data: {
      escalation_type: props.body.escalation_type ?? undefined,
      escalation_status: props.body.escalation_status ?? undefined,
      resolution_type: props.body.resolution_type ?? undefined,
      resolution_comment: props.body.resolution_comment ?? undefined,
      assigned_admin_id: props.body.assigned_admin_id ?? undefined,
      updated_at: now,
    },
  });
  // 3. Return API type, map Date fields and nullables
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    initiator_customer_id:
      updated.initiator_customer_id === null
        ? undefined
        : updated.initiator_customer_id,
    initiator_seller_id:
      updated.initiator_seller_id === null
        ? undefined
        : updated.initiator_seller_id,
    assigned_admin_id:
      updated.assigned_admin_id === null
        ? undefined
        : updated.assigned_admin_id,
    escalation_type: updated.escalation_type,
    escalation_status: updated.escalation_status,
    resolution_type:
      updated.resolution_type === null ? undefined : updated.resolution_type,
    resolution_comment:
      updated.resolution_comment === null
        ? undefined
        : updated.resolution_comment,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
