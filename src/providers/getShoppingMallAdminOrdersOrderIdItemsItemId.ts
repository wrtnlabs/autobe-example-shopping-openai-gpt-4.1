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

export async function getShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
  });
  if (!item || item.shopping_mall_order_id !== props.orderId) {
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
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  };
}
