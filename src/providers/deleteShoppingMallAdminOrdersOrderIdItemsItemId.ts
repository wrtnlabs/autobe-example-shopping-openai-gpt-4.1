import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the order item, ensure it exists and belongs to the order
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      refund_status: true,
      quantity: true,
      unit_price: true,
      item_total: true,
      shopping_mall_order_id: true,
      shopping_mall_product_sku_id: true,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  // 2. Only allow deletion if not already shipped/delivered/refunded
  if (item.refund_status !== "none") {
    throw new HttpException(
      "Order item cannot be deleted after shipment or refund",
      409,
    );
  }

  // 3. Soft-delete the order item (set deleted_at) with ISO string
  const deletedTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      deleted_at: deletedTimestamp,
    },
  });

  // 4. Recalculate order total after item deletion
  const remainingItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: {
        item_total: true,
      },
    });
  const newOrderTotal = remainingItems.reduce(
    (acc, cur) => acc + cur.item_total,
    0,
  );

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      order_total: newOrderTotal,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
