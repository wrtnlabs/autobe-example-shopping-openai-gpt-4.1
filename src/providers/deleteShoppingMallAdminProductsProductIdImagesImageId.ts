import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1: Fetch the image
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      url: true,
      display_order: true,
    },
  });
  if (!image || image.shopping_mall_product_id !== props.productId)
    throw new HttpException(
      "Image not found or does not belong to the specified product",
      404,
    );

  // 2: Fetch the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, main_image_url: true },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // 3: Fetch all images for the product (count, data for fallback)
  const images = await MyGlobal.prisma.shopping_mall_catalog_images.findMany({
    where: { shopping_mall_product_id: props.productId },
    select: { id: true, url: true, display_order: true },
    orderBy: { display_order: "asc" },
  });
  if (images.length === 0)
    throw new HttpException("No images found for product", 404); // Defensive (shouldn't happen)
  if (images.length === 1)
    throw new HttpException(
      "Cannot delete the last product image (at least one required)",
      409,
    );

  // 4: Check if image is main and calculate fallback url if needed
  const isMainImage = product.main_image_url === image.url;
  let nextMainImageUrl: string | null = null;
  if (isMainImage) {
    const fallbackImage = images.find((img) => img.id !== image.id);
    nextMainImageUrl = fallbackImage ? fallbackImage.url : null;
  }

  // 5: Delete the image
  await MyGlobal.prisma.shopping_mall_catalog_images.delete({
    where: { id: props.imageId },
  });

  // 6: If needed, update product's main_image_url
  if (isMainImage && nextMainImageUrl) {
    await MyGlobal.prisma.shopping_mall_products.update({
      where: { id: props.productId },
      data: { main_image_url: nextMainImageUrl },
    });
  }
}
