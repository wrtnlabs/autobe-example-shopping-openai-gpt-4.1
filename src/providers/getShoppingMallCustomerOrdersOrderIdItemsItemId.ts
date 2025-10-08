import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_sku_id: true,
      item_name: true,
      sku_code: true,
      quantity: true,
      unit_price: true,
      currency: true,
      item_total: true,
      refund_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      order: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!item || item.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found", 404);
  }
  if (item.order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (item.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }
  if (item.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }

  return {
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    item_name: item.item_name,
    sku_code: item.sku_code,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency: item.currency,
    item_total: item.item_total,
    refund_status: item.refund_status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
  };
}
