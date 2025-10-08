import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerEscalationsEscalationId(props: {
  seller: SellerPayload;
  escalationId: string & tags.Format<"uuid">;
  body: IShoppingMallEscalation.IUpdate;
}): Promise<IShoppingMallEscalation> {
  const { seller, escalationId, body } = props;
  // 1. Fetch escalation record and check permissions
  const escalation = await MyGlobal.prisma.shopping_mall_escalations.findFirst({
    where: {
      id: escalationId,
      deleted_at: null,
    },
  });
  if (!escalation)
    throw new HttpException("Escalation not found or deleted.", 404);
  if (escalation.initiator_seller_id !== seller.id)
    throw new HttpException("Forbidden: You do not own this escalation.", 403);

  // 2. Build update input, only allowed fields
  const now = toISOStringSafe(new Date());
  const updateData = {
    escalation_type: body.escalation_type ?? undefined,
    escalation_status: body.escalation_status ?? undefined,
    resolution_type: body.resolution_type ?? undefined,
    resolution_comment: body.resolution_comment ?? undefined,
    assigned_admin_id: body.assigned_admin_id ?? undefined,
    updated_at: now,
  };

  // 3. Update record
  const updated = await MyGlobal.prisma.shopping_mall_escalations.update({
    where: { id: escalationId },
    data: updateData,
  });

  // 4. Return API structure (handle null vs undefined and all datetimes)
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    initiator_customer_id: updated.initiator_customer_id ?? undefined,
    initiator_seller_id: updated.initiator_seller_id ?? undefined,
    assigned_admin_id: updated.assigned_admin_id ?? undefined,
    escalation_type: updated.escalation_type,
    escalation_status: updated.escalation_status,
    resolution_type: updated.resolution_type ?? undefined,
    resolution_comment: updated.resolution_comment ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
