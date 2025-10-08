import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";

export async function getShoppingMallProductsProductIdSkusSkuIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCatalogImage> {
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      shopping_mall_product_sku_id: props.skuId,
      // deleted_at: null, // Field does not exist in schema
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_sku_id: true,
      url: true,
      alt_text: true,
      display_order: true,
      created_at: true,
    },
  });
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to the specified product/SKU",
      404,
    );
  }
  return {
    id: image.id,
    shopping_mall_product_id:
      image.shopping_mall_product_id === null
        ? undefined
        : image.shopping_mall_product_id,
    shopping_mall_product_sku_id:
      image.shopping_mall_product_sku_id === null
        ? undefined
        : image.shopping_mall_product_sku_id,
    url: image.url,
    alt_text: image.alt_text === null ? undefined : image.alt_text,
    display_order: image.display_order,
    created_at: toISOStringSafe(image.created_at),
  };
}
