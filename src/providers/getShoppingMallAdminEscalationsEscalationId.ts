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

export async function getShoppingMallAdminEscalationsEscalationId(props: {
  admin: AdminPayload;
  escalationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallEscalation> {
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      id: props.escalationId,
      deleted_at: null,
    },
  });
  if (!escalation) {
    throw new HttpException("Escalation not found", 404);
  }
  return {
    id: escalation.id,
    shopping_mall_order_id: escalation.shopping_mall_order_id,
    initiator_customer_id:
      escalation.initiator_customer_id === null
        ? undefined
        : escalation.initiator_customer_id,
    initiator_seller_id:
      escalation.initiator_seller_id === null
        ? undefined
        : escalation.initiator_seller_id,
    assigned_admin_id:
      escalation.assigned_admin_id === null
        ? undefined
        : escalation.assigned_admin_id,
    escalation_type: escalation.escalation_type,
    escalation_status: escalation.escalation_status,
    resolution_type:
      escalation.resolution_type === null
        ? undefined
        : escalation.resolution_type,
    resolution_comment:
      escalation.resolution_comment === null
        ? undefined
        : escalation.resolution_comment,
    created_at: toISOStringSafe(escalation.created_at),
    updated_at: toISOStringSafe(escalation.updated_at),
    deleted_at: escalation.deleted_at
      ? toISOStringSafe(escalation.deleted_at)
      : undefined,
  };
}
