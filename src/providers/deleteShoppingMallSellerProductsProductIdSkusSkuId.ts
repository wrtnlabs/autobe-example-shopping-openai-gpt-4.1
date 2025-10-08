import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure SKU exists, belongs to specified product
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      deleted_at: true,
      product: {
        select: {
          shopping_mall_seller_id: true,
        },
      },
    },
  });
  if (!sku) throw new HttpException("SKU not found", 404);
  if (sku.shopping_mall_product_id !== props.productId)
    throw new HttpException(
      "SKU does not belong to the specified product",
      404,
    );

  // 2. Ownership check
  if (sku.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product/SKU", 403);
  }

  // 3. Block if SKU referenced in pending/active orders.
  const activeOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_sku_id: props.skuId,
        order: {
          status: {
            in: ["pending", "active"],
          },
          deleted_at: null,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (activeOrderItem) {
    throw new HttpException(
      "SKU is referenced in active or pending orders and cannot be deleted.",
      409,
    );
  }

  // 4. Soft delete the SKU
  await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: props.skuId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Optionally, log event for audit (not required in output)
}
