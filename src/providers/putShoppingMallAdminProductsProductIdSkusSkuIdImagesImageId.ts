import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCatalogImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdSkusSkuIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IUpdate;
}): Promise<IShoppingMallCatalogImage> {
  // 1. Find the image; must exist and belong to given product and SKU.
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image) throw new HttpException("Image not found", 404);
  if (
    image.shopping_mall_product_id !== props.productId ||
    image.shopping_mall_product_sku_id !== props.skuId
  ) {
    throw new HttpException(
      "Image does not belong to specified product and SKU",
      404,
    );
  }

  // 2. Update fields if provided
  const updated = await MyGlobal.prisma.shopping_mall_catalog_images.update({
    where: { id: props.imageId },
    data: {
      url: props.body.url ?? undefined,
      alt_text:
        props.body.alt_text !== undefined ? props.body.alt_text : undefined,
      display_order: props.body.display_order ?? undefined,
      // No update to created_at or id
    },
  });

  // 3. Return object following IShoppingMallCatalogImage, all types correct.
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id:
      updated.shopping_mall_product_sku_id ?? undefined,
    url: updated.url,
    alt_text: updated.alt_text ?? undefined,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
  };
}
