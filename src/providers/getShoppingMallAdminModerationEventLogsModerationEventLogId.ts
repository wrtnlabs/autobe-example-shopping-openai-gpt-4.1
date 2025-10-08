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

export async function getShoppingMallAdminModerationEventLogsModerationEventLogId(props: {
  admin: AdminPayload;
  moderationEventLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallModerationEventLog> {
  const log =
    await MyGlobal.prisma.shopping_mall_moderation_event_logs.findUnique({
      where: { id: props.moderationEventLogId },
    });
  if (!log) {
    throw new HttpException("Moderation event log not found", 404);
  }

  return {
    id: log.id,
    shopping_mall_admin_id: log.shopping_mall_admin_id,
    affected_seller_id: log.affected_seller_id ?? undefined,
    affected_product_id: log.affected_product_id ?? undefined,
    affected_review_id: log.affected_review_id ?? undefined,
    affected_order_id: log.affected_order_id ?? undefined,
    event_type: log.event_type,
    moderation_message: log.moderation_message,
    created_at: toISOStringSafe(log.created_at),
  };
}
