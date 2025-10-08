import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.ICreate;
}): Promise<IShoppingMallCatalogImage> {
  // 1. Check product existence and seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }

  // 2. Create catalog image record
  const created = await MyGlobal.prisma.shopping_mall_catalog_images.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_sku_id:
        props.body.shopping_mall_product_sku_id ?? null,
      url: props.body.url,
      alt_text: props.body.alt_text ?? null,
      display_order: props.body.display_order,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Output DTO
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id:
      created.shopping_mall_product_sku_id ?? undefined,
    url: created.url,
    alt_text: created.alt_text ?? undefined,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
  };
}
