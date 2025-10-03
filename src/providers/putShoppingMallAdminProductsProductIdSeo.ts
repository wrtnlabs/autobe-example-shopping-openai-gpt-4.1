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

export async function putShoppingMallAdminProductsProductIdSeo(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSeoMetadata.IUpdate;
}): Promise<IShoppingMallProductSeoMetadata> {
  // Check product existence and not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Upsert SEO metadata (one-to-one via shopping_mall_product_id)
  const record =
    await MyGlobal.prisma.shopping_mall_product_seo_metadata.upsert({
      where: {
        shopping_mall_product_id: props.productId,
      },
      update: {
        meta_title: props.body.meta_title,
        meta_description: props.body.meta_description,
        meta_keywords: props.body.meta_keywords,
      },
      create: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        meta_title: props.body.meta_title,
        meta_description: props.body.meta_description,
        meta_keywords: props.body.meta_keywords,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        meta_title: true,
        meta_description: true,
        meta_keywords: true,
      },
    });
  return record;
}
