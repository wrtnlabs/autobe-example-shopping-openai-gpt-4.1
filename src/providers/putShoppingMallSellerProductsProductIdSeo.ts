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

export async function putShoppingMallSellerProductsProductIdSeo(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSeoMetadata.IUpdate;
}): Promise<IShoppingMallProductSeoMetadata> {
  // Step 1: Confirm product exists and seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { shopping_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product does not exist", 404);
  }
  // Find seller record to get mapped customer_id
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
    select: { shopping_mall_customer_id: true },
  });
  if (!sellerRecord) {
    throw new HttpException("Seller not found for product", 404);
  }
  // Only allow if the seller making request owns product (seller.customer_id === props.seller.id)
  if (sellerRecord.shopping_mall_customer_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Step 2: Upsert SEO metadata
  const existing =
    await MyGlobal.prisma.shopping_mall_product_seo_metadata.findUnique({
      where: { shopping_mall_product_id: props.productId },
    });
  if (existing) {
    const updated =
      await MyGlobal.prisma.shopping_mall_product_seo_metadata.update({
        where: { shopping_mall_product_id: props.productId },
        data: {
          meta_title: props.body.meta_title,
          meta_description: props.body.meta_description,
          meta_keywords: props.body.meta_keywords,
        },
      });
    return {
      id: updated.id,
      shopping_mall_product_id: updated.shopping_mall_product_id,
      meta_title: updated.meta_title,
      meta_description: updated.meta_description,
      meta_keywords: updated.meta_keywords,
    };
  }
  // If not exists, create new one
  const newId: string & tags.Format<"uuid"> = v4();
  const created =
    await MyGlobal.prisma.shopping_mall_product_seo_metadata.create({
      data: {
        id: newId,
        shopping_mall_product_id: props.productId,
        meta_title: props.body.meta_title,
        meta_description: props.body.meta_description,
        meta_keywords: props.body.meta_keywords,
      },
    });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    meta_title: created.meta_title,
    meta_description: created.meta_description,
    meta_keywords: created.meta_keywords,
  };
}
