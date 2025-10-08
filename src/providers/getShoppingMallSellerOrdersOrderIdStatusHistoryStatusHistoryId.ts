import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdStatusHistoryStatusHistoryId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  // Fetch status history event (must match both orderId and statusHistoryId and not deleted)
  const record =
    await MyGlobal.prisma.shopping_mall_order_status_history.findFirst({
      where: {
        id: props.statusHistoryId,
        shopping_mall_order_id: props.orderId,
        // 'deleted_at' removed as it's not defined in the Prisma model
      },
    });
  if (!record) {
    throw new HttpException("Order status history not found", 404);
  }
  // Fetch the parent order to check for seller ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: record.shopping_mall_order_id },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Seller does not own this order", 403);
  }
  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    actor_customer_id: record.actor_customer_id ?? undefined,
    actor_seller_id: record.actor_seller_id ?? undefined,
    actor_admin_id: record.actor_admin_id ?? undefined,
    event_type: record.event_type,
    status_before: record.status_before ?? undefined,
    status_after: record.status_after ?? undefined,
    message: record.message ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
