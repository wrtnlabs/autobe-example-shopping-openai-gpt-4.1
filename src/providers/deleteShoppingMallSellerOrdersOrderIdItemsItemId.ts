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
  // Step 1: Find the order item and join to product via SKU
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    include: {
      productSku: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!item) {
    throw new HttpException("Order item not found for the given order.", 404);
  }
  // Step 2: Validate ownership (seller must own the product)
  if (!item.productSku || !item.productSku.product) {
    throw new HttpException("Order item product info missing.", 500);
  }
  if (item.productSku.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Cannot remove items for products you do not own.",
      403,
    );
  }
  // Step 3: Block if item cannot be removed (fulfillment/refund status)
  if (
    ["shipped", "delivered", "refunded", "canceled", "cancelled"].includes(
      item.refund_status,
    )
  ) {
    throw new HttpException(
      "Order item cannot be removed in its current fulfillment/refund state.",
      409,
    );
  }
  // Step 4: Soft delete by setting deleted_at
  const timestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: { deleted_at: timestamp, updated_at: timestamp },
  });
}
