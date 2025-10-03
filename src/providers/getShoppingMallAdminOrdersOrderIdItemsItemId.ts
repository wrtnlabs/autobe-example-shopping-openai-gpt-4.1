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
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_id: orderItem.shopping_mall_product_id,
    // optional variant reference
    ...(orderItem.shopping_mall_product_variant_id !== undefined &&
    orderItem.shopping_mall_product_variant_id !== null
      ? {
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
        }
      : {}),
    shopping_mall_seller_id: orderItem.shopping_mall_seller_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    final_price: orderItem.final_price,
    // optional discount snapshot
    ...(orderItem.discount_snapshot !== undefined &&
    orderItem.discount_snapshot !== null
      ? { discount_snapshot: orderItem.discount_snapshot }
      : {}),
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    // optional deleted_at for soft deletes
    ...(orderItem.deleted_at !== undefined && orderItem.deleted_at !== null
      ? { deleted_at: toISOStringSafe(orderItem.deleted_at) }
      : {}),
  };
}
