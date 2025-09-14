import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Deletes a specific product image from ai_commerce_product_images.
 *
 * Performs a hard delete of the product image if the seller owns the product
 * and the image is linked to the product. Throws errors if the product does not
 * exist or is not owned by the seller, or if the image does not exist or is not
 * linked to the product. No response body is returned upon successful
 * deletion.
 *
 * @param props - The operation properties.
 * @param props.seller - Authenticated seller performing the operation.
 * @param props.productId - Product ID the image belongs to (UUID).
 * @param props.imageId - Unique image ID to be deleted (UUID).
 * @returns Void
 * @throws {Error} If the product or image is not found, unauthorized, or
 *   already deleted.
 */
export async function deleteaiCommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, imageId } = props;

  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
    },
  });
  if (!product) {
    throw new Error("Product not found, forbidden, or already deleted.");
  }

  // Verify image exists and is linked to the product
  const image = await MyGlobal.prisma.ai_commerce_product_images.findFirst({
    where: {
      id: imageId,
      product_id: productId,
    },
  });
  if (!image) {
    throw new Error("Image not found or not linked to this product.");
  }

  // Hard delete the image record
  await MyGlobal.prisma.ai_commerce_product_images.delete({
    where: { id: imageId },
  });
}
