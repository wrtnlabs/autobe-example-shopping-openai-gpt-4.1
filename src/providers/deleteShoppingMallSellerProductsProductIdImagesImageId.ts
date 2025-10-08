import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, imageId } = props;

  // 1. Find the product and verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { id: true, shopping_mall_seller_id: true, main_image_url: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You can only delete images from your own products",
      403,
    );
  }

  // 2. Find the image and verify association to the product
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findUnique({
    where: { id: imageId },
    select: { id: true, shopping_mall_product_id: true, url: true },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  if (image.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      400,
    );
  }

  // 3. Count images for the product
  const imageCount = await MyGlobal.prisma.shopping_mall_catalog_images.count({
    where: {
      shopping_mall_product_id: productId,
    },
  });
  if (imageCount <= 1) {
    throw new HttpException(
      "Cannot delete the last product image. At least one image must remain.",
      400,
    );
  }

  // 4. Remove the image
  await MyGlobal.prisma.shopping_mall_catalog_images.delete({
    where: { id: imageId },
  });

  // 5. If deleted image was the main image, set a fallback
  if (product.main_image_url && image.url === product.main_image_url) {
    // Find the first (by display_order, then created_at) image after deletion
    const fallbackImage =
      await MyGlobal.prisma.shopping_mall_catalog_images.findFirst({
        where: {
          shopping_mall_product_id: productId,
        },
        orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
        select: { url: true },
      });
    await MyGlobal.prisma.shopping_mall_products.update({
      where: { id: productId },
      data: { main_image_url: fallbackImage ? fallbackImage.url : null },
    });
  }
}
