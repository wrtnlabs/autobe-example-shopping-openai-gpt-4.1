import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const { seller, orderId, itemId } = props;

  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_order_id: orderId,
      deleted_at: null,
    },
  });

  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  if (item.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You do not have permission to view this order item",
      403,
    );
  }

  return {
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id === undefined
        ? undefined
        : item.shopping_mall_product_variant_id === null
          ? null
          : item.shopping_mall_product_variant_id,
    shopping_mall_seller_id: item.shopping_mall_seller_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    final_price: item.final_price,
    discount_snapshot: item.discount_snapshot ?? undefined,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  };
}
