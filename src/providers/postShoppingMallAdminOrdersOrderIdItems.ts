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

export async function postShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const now = toISOStringSafe(new Date());

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, status: true, deleted_at: true },
  });
  if (!order || order.deleted_at) {
    throw new HttpException("Order not found", 404);
  }
  if (order.status !== "pending" && order.status !== "processing") {
    throw new HttpException(
      "Order cannot be modified in its current status",
      400,
    );
  }
  if (props.body.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "shopping_mall_order_id does not match path orderId",
      400,
    );
  }
  const existingItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: props.orderId,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingItem) {
    throw new HttpException("SKU already exists in this order", 409);
  }
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.body.shopping_mall_product_sku_id },
    select: { id: true, status: true, deleted_at: true },
  });
  if (!sku || sku.deleted_at || sku.status !== "active") {
    throw new HttpException("Specified SKU not available.", 400);
  }
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: {
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      },
      select: { quantity_available: true },
    });
  if (!inventory || inventory.quantity_available < props.body.quantity) {
    throw new HttpException("Insufficient inventory.", 409);
  }
  const itemId = v4() as string & tags.Format<"uuid">;
  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: itemId,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      item_name: props.body.item_name,
      sku_code: props.body.sku_code,
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      currency: props.body.currency,
      item_total: props.body.item_total,
      refund_status: "none",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      order_total: { increment: props.body.item_total },
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_inventory_records.update({
    where: {
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
    },
    data: {
      quantity_available: { decrement: props.body.quantity },
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      affected_order_id: props.orderId,
      action_type: "add_order_item",
      action_reason: `Admin added order item SKU ${props.body.shopping_mall_product_sku_id}`,
      domain: "order",
      created_at: now,
    },
  });
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    item_name: created.item_name,
    sku_code: created.sku_code,
    quantity: created.quantity,
    unit_price: created.unit_price,
    currency: created.currency,
    item_total: created.item_total,
    refund_status: created.refund_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
