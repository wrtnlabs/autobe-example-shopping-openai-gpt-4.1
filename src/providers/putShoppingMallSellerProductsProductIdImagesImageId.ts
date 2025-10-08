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

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IUpdate;
}): Promise<IShoppingMallCatalogImage> {
  // Fetch the image
  const catalogImage =
    await MyGlobal.prisma.shopping_mall_catalog_images.findFirst({
      where: {
        id: props.imageId,
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
  if (!catalogImage) {
    throw new HttpException("Image not found", 404);
  }
  // Match image to correct product
  if (catalogImage.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 404);
  }
  // Check product owner
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      shopping_mall_seller_id: true,
    },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Apply updates: url, alt_text, display_order
  const updated = await MyGlobal.prisma.shopping_mall_catalog_images.update({
    where: { id: props.imageId },
    data: {
      url: props.body.url ?? undefined,
      alt_text: props.body.alt_text ?? undefined,
      display_order: props.body.display_order ?? undefined,
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
