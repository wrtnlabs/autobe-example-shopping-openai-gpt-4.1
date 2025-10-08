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

export async function postShoppingMallSellerProductsProductIdSkusSkuIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.ICreate;
}): Promise<IShoppingMallCatalogImage> {
  // 1. Find product: must exist, not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (product === null) throw new HttpException("Product not found", 404);
  // 2. Authorization check
  if (product.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException(
      "Forbidden: You are not the owner of this product",
      403,
    );
  // 3. Find SKU: must exist, match productId, not deleted
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (sku === null)
    throw new HttpException("SKU not found or does not belong to product", 404);
  // 4. Create the catalog image
  const result = await MyGlobal.prisma.shopping_mall_catalog_images.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_product_sku_id: props.skuId,
      url: props.body.url,
      alt_text: props.body.alt_text ?? undefined,
      display_order: props.body.display_order,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Return IShoppingMallCatalogImage type
  return {
    id: result.id,
    shopping_mall_product_id:
      result.shopping_mall_product_id !== null
        ? (result.shopping_mall_product_id satisfies string as string)
        : undefined,
    shopping_mall_product_sku_id:
      result.shopping_mall_product_sku_id !== null
        ? (result.shopping_mall_product_sku_id satisfies string as string)
        : undefined,
    url: result.url,
    alt_text: result.alt_text ?? undefined,
    display_order: result.display_order,
    created_at: toISOStringSafe(result.created_at),
  };
}
