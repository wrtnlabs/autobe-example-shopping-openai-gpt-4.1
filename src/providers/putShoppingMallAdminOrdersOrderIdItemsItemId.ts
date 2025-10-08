import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // (1) Verify order exists and is not fulfilled/cancelled/deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
      status: { notIn: ["fulfilled", "cancelled"] },
    },
  });
  if (!order) {
    throw new HttpException("Order not found or is locked.", 400);
  }

  // (2) Verify item exists, belongs to order, not deleted
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found.", 404);
  }
  // (3) Forbid updates if refund_status is locked
  if (["refunded", "cancelled"].includes(item.refund_status)) {
    throw new HttpException(
      "Order item cannot be updated (locked state).",
      400,
    );
  }

  // (4) Compute target values
  const targetQuantity = props.body.quantity ?? item.quantity;
  const targetUnitPrice = props.body.unit_price ?? item.unit_price;
  if (targetQuantity < 1) {
    throw new HttpException("Quantity must be at least 1.", 400);
  }
  // (5) Calculate new item_total
  const newItemTotal = targetQuantity * targetUnitPrice;

  // (6) Update item
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      quantity: props.body.quantity ?? undefined,
      unit_price: props.body.unit_price ?? undefined,
      item_name: props.body.item_name ?? undefined,
      currency: props.body.currency ?? undefined,
      refund_status: props.body.refund_status ?? undefined,
      item_total: newItemTotal,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // (7) Recompute order order_total (sum of items not deleted)
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: { item_total: true },
  });
  const newOrderTotal = items.reduce((acc, cur) => acc + cur.item_total, 0);
  // (8) Update order.order_total
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      order_total: newOrderTotal,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // (9) Audit log (minimal: action_type/update, domain/order_item)
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action_type: "update",
      action_reason: "Order item updated by admin",
      domain: "order_item",
      affected_order_id: props.orderId,
      affected_product_id: item.shopping_mall_product_sku_id,
      details_json: JSON.stringify({
        prev: { quantity: item.quantity, unit_price: item.unit_price },
        next: { quantity: targetQuantity, unit_price: targetUnitPrice },
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // (10) Return updated item in required DTO shape
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    item_name: updated.item_name,
    sku_code: updated.sku_code,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    currency: updated.currency,
    item_total: updated.item_total,
    refund_status: updated.refund_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
