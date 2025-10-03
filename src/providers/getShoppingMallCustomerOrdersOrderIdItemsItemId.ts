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
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this order",
      403,
    );
  }
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }
  return {
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: item.shopping_mall_seller_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    final_price: item.final_price,
    discount_snapshot: item.discount_snapshot ?? undefined,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  };
}
