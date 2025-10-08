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

export async function putShoppingMallAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IUpdate;
}): Promise<IShoppingMallCatalogImage> {
  const { productId, imageId, body } = props;

  // 1: Find the image and verify it belongs to the product
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findFirst({
    where: {
      id: imageId,
      shopping_mall_product_id: productId,
    },
  });
  if (!image) {
    throw new HttpException("Image not found for this product", 404);
  }

  // 2: Update permitted fields only
  const updated = await MyGlobal.prisma.shopping_mall_catalog_images.update({
    where: { id: imageId },
    data: {
      url: body.url ?? undefined,
      alt_text: body.alt_text ?? undefined,
      display_order: body.display_order ?? undefined,
    },
  });

  // 3: Return updated image data, converting types as needed
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
