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

export async function putShoppingMallSellerProductsProductIdSkusSkuIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallCatalogImage.IUpdate;
}): Promise<IShoppingMallCatalogImage> {
  // Step 1: Ownership & existence check (deep join by product → SKU → image)
  const imageRecord =
    await MyGlobal.prisma.shopping_mall_catalog_images.findFirst({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        shopping_mall_product_sku_id: props.skuId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_product_sku_id: true,
        url: true,
        alt_text: true,
        display_order: true,
        created_at: true,
        product: {
          select: {
            seller: {
              select: { id: true },
            },
          },
        },
      },
    });

  if (!imageRecord) {
    throw new HttpException(
      "Image not found for given product/SKU/imageId.",
      404,
    );
  }
  if (
    !imageRecord.product ||
    imageRecord.product.seller.id !== props.seller.id
  ) {
    throw new HttpException(
      "Forbidden: you do not have permission to update this image.",
      403,
    );
  }

  // Step 2: Update
  const updated = await MyGlobal.prisma.shopping_mall_catalog_images.update({
    where: { id: props.imageId },
    data: {
      url: props.body.url ?? undefined,
      alt_text: props.body.alt_text ?? undefined,
      display_order: props.body.display_order ?? undefined,
      // updated_at field does not exist; removed
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
