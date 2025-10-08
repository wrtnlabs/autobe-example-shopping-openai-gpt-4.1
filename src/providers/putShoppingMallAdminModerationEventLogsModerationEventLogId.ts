import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminModerationEventLogsModerationEventLogId(props: {
  admin: AdminPayload;
  moderationEventLogId: string & tags.Format<"uuid">;
  body: IShoppingMallModerationEventLog.IUpdate;
}): Promise<IShoppingMallModerationEventLog> {
  // Validate record exists and fetch current state
  const existing =
    await MyGlobal.prisma.shopping_mall_moderation_event_logs.findUnique({
      where: { id: props.moderationEventLogId },
      select: { id: true },
    });
  if (!existing) {
    throw new HttpException("Moderation event log not found", 404);
  }
  // Only include updatable fields if present in body
  const updateFields = {
    ...(props.body.event_type !== undefined
      ? { event_type: props.body.event_type }
      : {}),
    ...(props.body.moderation_message !== undefined
      ? { moderation_message: props.body.moderation_message }
      : {}),
    ...(props.body.affected_seller_id !== undefined
      ? { affected_seller_id: props.body.affected_seller_id }
      : {}),
    ...(props.body.affected_product_id !== undefined
      ? { affected_product_id: props.body.affected_product_id }
      : {}),
    ...(props.body.affected_review_id !== undefined
      ? { affected_review_id: props.body.affected_review_id }
      : {}),
    ...(props.body.affected_order_id !== undefined
      ? { affected_order_id: props.body.affected_order_id }
      : {}),
  };
  // Perform the update
  const updated =
    await MyGlobal.prisma.shopping_mall_moderation_event_logs.update({
      where: { id: props.moderationEventLogId },
      data: updateFields,
      select: {
        id: true,
        shopping_mall_admin_id: true,
        affected_seller_id: true,
        affected_product_id: true,
        affected_review_id: true,
        affected_order_id: true,
        event_type: true,
        moderation_message: true,
        created_at: true,
      },
    });
  return {
    id: updated.id,
    shopping_mall_admin_id: updated.shopping_mall_admin_id,
    ...(updated.affected_seller_id !== null
      ? { affected_seller_id: updated.affected_seller_id }
      : {}),
    ...(updated.affected_product_id !== null
      ? { affected_product_id: updated.affected_product_id }
      : {}),
    ...(updated.affected_review_id !== null
      ? { affected_review_id: updated.affected_review_id }
      : {}),
    ...(updated.affected_order_id !== null
      ? { affected_order_id: updated.affected_order_id }
      : {}),
    event_type: updated.event_type,
    moderation_message: updated.moderation_message,
    created_at: toISOStringSafe(updated.created_at),
  };
}
