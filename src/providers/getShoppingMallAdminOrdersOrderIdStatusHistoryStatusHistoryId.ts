import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdStatusHistoryStatusHistoryId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  const history =
    await MyGlobal.prisma.shopping_mall_order_status_history.findFirst({
      where: {
        id: props.statusHistoryId,
        shopping_mall_order_id: props.orderId,
        // deleted_at removed - does not exist in schema
      },
    });
  if (!history) {
    throw new HttpException("Status history not found", 404);
  }
  return {
    id: history.id,
    shopping_mall_order_id: history.shopping_mall_order_id,
    actor_customer_id: history.actor_customer_id ?? null,
    actor_seller_id: history.actor_seller_id ?? null,
    actor_admin_id: history.actor_admin_id ?? null,
    event_type: history.event_type,
    status_before: history.status_before ?? null,
    status_after: history.status_after ?? null,
    message: history.message ?? null,
    created_at: toISOStringSafe(history.created_at),
  };
}
