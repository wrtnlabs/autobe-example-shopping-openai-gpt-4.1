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

export async function postShoppingMallAdminModerationEventLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallModerationEventLog.ICreate;
}): Promise<IShoppingMallModerationEventLog> {
  const now = toISOStringSafe(new Date());
  if (props.body.shopping_mall_admin_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: Only the acting admin can create their own moderation event log entry.",
      403,
    );
  }
  const row = await MyGlobal.prisma.shopping_mall_moderation_event_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.body.shopping_mall_admin_id,
      affected_seller_id: props.body.affected_seller_id ?? undefined,
      affected_product_id: props.body.affected_product_id ?? undefined,
      affected_review_id: props.body.affected_review_id ?? undefined,
      affected_order_id: props.body.affected_order_id ?? undefined,
      event_type: props.body.event_type,
      moderation_message: props.body.moderation_message,
      created_at: now,
    },
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
    id: row.id,
    shopping_mall_admin_id: row.shopping_mall_admin_id,
    affected_seller_id: row.affected_seller_id,
    affected_product_id: row.affected_product_id,
    affected_review_id: row.affected_review_id,
    affected_order_id: row.affected_order_id,
    event_type: row.event_type,
    moderation_message: row.moderation_message,
    created_at: toISOStringSafe(row.created_at),
  };
}
