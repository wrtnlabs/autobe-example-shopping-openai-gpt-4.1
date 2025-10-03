import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find order item (must exist, match order, belong to seller)
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to specified order",
      404,
    );
  }
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("You are not the owner of this order item", 403);
  }
  // Deletable statuses: not paid, not shipping, not shipped, not delivered, not completed
  const nonDeletableStatuses = [
    "paid",
    "shipping",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "returned",
  ];
  if (nonDeletableStatuses.includes(orderItem.status.toLowerCase())) {
    throw new HttpException(
      `Order item cannot be deleted in its current status: ${orderItem.status}`,
      409,
    );
  }
  // Step 2: Hard delete
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: props.itemId },
  });
  // Step 3: Audit log
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "order_item",
      entity_id: props.itemId,
      event_type: "delete",
      actor_id: props.seller.id,
      snapshot_id: null,
      event_result: "success",
      event_message: null,
      event_time: now,
      created_at: now,
    },
  });
}
