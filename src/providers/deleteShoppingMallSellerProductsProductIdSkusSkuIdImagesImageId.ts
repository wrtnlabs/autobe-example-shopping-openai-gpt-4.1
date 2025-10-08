import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdSkusSkuIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the catalog image and check existence/matching
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_sku_id: true,
    },
  });
  if (
    !image ||
    image.shopping_mall_product_id !== props.productId ||
    image.shopping_mall_product_sku_id !== props.skuId
  ) {
    throw new HttpException(
      "Image not found or does not match specified SKU/Product",
      404,
    );
  }
  // 2. Fetch the SKU and product, check soft deletion (must not be deleted)
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      deleted_at: true,
    },
  });
  if (
    !sku ||
    sku.shopping_mall_product_id !== props.productId ||
    sku.deleted_at !== null
  ) {
    throw new HttpException("SKU not found or deleted", 404);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or deleted", 404);
  }
  // 3. Authorization: seller must own the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // 4. Perform hard delete (no soft delete field exists!)
  await MyGlobal.prisma.shopping_mall_catalog_images.delete({
    where: { id: props.imageId },
  });
}
