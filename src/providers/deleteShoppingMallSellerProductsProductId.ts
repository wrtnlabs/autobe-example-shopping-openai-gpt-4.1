import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find product (must exist, and belong to seller, not deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Product not found or you do not have permission to delete this product",
      404,
    );
  }
  // 2. Get the IDs of all SKUs for this product
  const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const skuIds = skus.map((sku) => sku.id);
  // 3. If there are SKUs, check if any are referenced in a non-terminal order
  if (skuIds.length > 0) {
    // Get all order items using these SKUs, and join to orders to check status
    const openOrders =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_sku_id: { in: skuIds },
          deleted_at: null,
          order: {
            deleted_at: null,
            status: {
              notIn: [
                "cancelled",
                "delivered",
                "refunded",
                "returned",
                "failed",
              ],
            },
          },
        },
        select: { id: true },
      });
    if (openOrders) {
      throw new HttpException(
        "Cannot delete product: Active or open orders exist for at least one SKU of this product.",
        409,
      );
    }
  }
  // 4. Proceed to hard delete (cascade will remove children)
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: {
      id: props.productId,
    },
  });
}
