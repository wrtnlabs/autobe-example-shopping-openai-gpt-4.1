import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSeoMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSeoMetadata";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdSeo(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSeoMetadata> {
  // Step 1: Fetch product, ensure it exists and not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Fetch SEO metadata row for product
  const seo =
    await MyGlobal.prisma.shopping_mall_product_seo_metadata.findFirst({
      where: { shopping_mall_product_id: props.productId },
    });
  if (!seo) {
    throw new HttpException("SEO metadata not found for this product", 404);
  }

  // Step 3: Map Prisma fields directly to API structure fields
  return {
    id: seo.id,
    shopping_mall_product_id: seo.shopping_mall_product_id,
    meta_title: seo.meta_title,
    meta_description: seo.meta_description,
    meta_keywords: seo.meta_keywords,
  };
}
