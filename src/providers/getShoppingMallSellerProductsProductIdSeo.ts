import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSeoMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSeoMetadata";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdSeo(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSeoMetadata> {
  // Step 1: Verify the product exists and is owned by the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
    },
    select: {
      id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  // Step 2: Retrieve the SEO metadata for the product
  const seo =
    await MyGlobal.prisma.shopping_mall_product_seo_metadata.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        meta_title: true,
        meta_description: true,
        meta_keywords: true,
      },
    });
  if (!seo) {
    throw new HttpException("SEO metadata not found for product", 404);
  }
  return {
    id: seo.id,
    shopping_mall_product_id: seo.shopping_mall_product_id,
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    meta_keywords: seo.meta_keywords,
  };
}
