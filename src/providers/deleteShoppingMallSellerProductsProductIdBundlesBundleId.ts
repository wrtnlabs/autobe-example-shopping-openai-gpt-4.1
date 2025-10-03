import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdBundlesBundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch bundle by id
  const bundle = await MyGlobal.prisma.shopping_mall_product_bundles.findUnique(
    {
      where: { id: props.bundleId },
    },
  );
  if (!bundle || bundle.deleted_at !== null) {
    throw new HttpException("Bundle not found", 404);
  }

  // Check that bundle belongs to product
  if (bundle.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Bundle does not belong to given product", 404);
  }

  // Fetch product by id
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }

  // Check that product is owned by seller
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  // Soft delete the bundle
  await MyGlobal.prisma.shopping_mall_product_bundles.update({
    where: { id: props.bundleId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // No return
}
