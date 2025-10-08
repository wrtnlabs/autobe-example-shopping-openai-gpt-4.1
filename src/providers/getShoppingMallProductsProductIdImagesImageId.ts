import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";

export async function getShoppingMallProductsProductIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCatalogImage> {
  const record =
    await MyGlobal.prisma.shopping_mall_catalog_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        product: { is_active: true },
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
  return {
    id: record.id,
    shopping_mall_product_id: record.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id:
      record.shopping_mall_product_sku_id ?? undefined,
    url: record.url,
    alt_text: record.alt_text ?? undefined,
    display_order: record.display_order,
    created_at: toISOStringSafe(record.created_at),
  };
}
