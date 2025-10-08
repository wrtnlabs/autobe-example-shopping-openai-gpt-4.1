import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrderHistoriesOrderHistoryId(props: {
  admin: AdminPayload;
  orderHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderHistory> {
  const orderHistory =
    await MyGlobal.prisma.shopping_mall_order_histories.findUnique({
      where: { id: props.orderHistoryId },
    });
  if (!orderHistory)
    throw new HttpException("Order history record not found", 404);
  return {
    id: orderHistory.id,
    shopping_mall_order_id: orderHistory.shopping_mall_order_id,
    snapshot_type: orderHistory.snapshot_type,
    order_status: orderHistory.order_status,
    order_total: orderHistory.order_total,
    snapshot_reason: orderHistory.snapshot_reason ?? undefined,
    created_at: toISOStringSafe(orderHistory.created_at),
    deleted_at: orderHistory.deleted_at
      ? toISOStringSafe(orderHistory.deleted_at)
      : undefined,
  };
}
