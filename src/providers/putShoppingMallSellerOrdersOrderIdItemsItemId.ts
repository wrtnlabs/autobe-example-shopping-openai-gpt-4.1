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

export async function putShoppingMallSellerOrdersOrderIdItemsItemId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Fetch the order item: must exist, belong to the specified order, and to the current seller
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found or access denied.", 404);
  }
  // Block updates if order item status is terminal
  if (["shipped", "fulfilled", "cancelled"].includes(orderItem.status)) {
    throw new HttpException(
      "Order item cannot be modified at this status.",
      409,
    );
  }
  // Patch update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status: props.body.status ?? undefined,
      final_price: props.body.final_price ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      updated.shopping_mall_product_variant_id === null
        ? undefined
        : updated.shopping_mall_product_variant_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    final_price: updated.final_price,
    discount_snapshot: updated.discount_snapshot,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
