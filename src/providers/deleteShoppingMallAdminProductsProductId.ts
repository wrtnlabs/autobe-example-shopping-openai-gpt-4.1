import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Ensure the product exists (throw 404 if not found)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Find all SKUs for the product
  const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
    where: { shopping_mall_product_id: props.productId },
    select: { id: true },
  });
  if (skus.length === 0) {
    // No SKUs: safe to delete immediately
    await MyGlobal.prisma.shopping_mall_products.delete({
      where: { id: props.productId },
    });
    return;
  }
  const skuIds = skus.map((sku) => sku.id);

  // Step 3: Check for open order items referencing these SKUs
  const openOrderStatuses = ["pending", "paid", "processing", "shipped"];

  // Join order_items to orders to check open order status
  const itemsWithOpenOrders =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_sku_id: { in: skuIds },
        order: { status: { in: openOrderStatuses } },
      },
    });
  if (itemsWithOpenOrders) {
    throw new HttpException(
      "Cannot delete: One or more SKUs are referenced by orders in progress. Deletion forbidden.",
      400,
    );
  }

  // Step 4: Delete product (will cascade delete children)
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: props.productId },
  });
}
