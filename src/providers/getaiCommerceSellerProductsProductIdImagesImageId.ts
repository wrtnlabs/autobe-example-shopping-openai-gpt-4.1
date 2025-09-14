import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a product image for a given product and imageId owned by the
 * authenticated seller.
 *
 * Fetches a specific product image from the ai_commerce_product_images table,
 * ensuring the product is owned by the requesting seller. Returns all persisted
 * metadata for the image, including order and locale. Throws an error if the
 * product is not owned by the seller or the image does not exist for the given
 * product.
 *
 * Authorization: Only the seller who owns the parent product can retrieve its
 * images. Admins or other sellers may not access this resource.
 *
 * @param props - Request payload
 * @param props.seller - Authenticated seller payload (must be owner of product)
 * @param props.productId - UUID of the parent product
 * @param props.imageId - UUID of the product image to retrieve
 * @returns IAiCommerceProductImage: Detailed data for the specified product
 *   image including attachment reference, locale, and display order.
 * @throws {Error} If product is not found or not owned by seller, or if the
 *   image record is missing for this product.
 */
export async function getaiCommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductImage> {
  // Check product ownership: Only allow seller to access products they own
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Product not found or access denied.");
  }

  // Get the image by id and product_id (ensure relationship and existence)
  const image = await MyGlobal.prisma.ai_commerce_product_images.findFirst({
    where: {
      id: props.imageId,
      product_id: props.productId,
    },
    select: {
      id: true,
      product_id: true,
      attachment_id: true,
      display_order: true,
      locale: true,
    },
  });
  if (!image) {
    throw new Error("Image not found for this product.");
  }

  return {
    id: image.id,
    product_id: image.product_id,
    attachment_id: image.attachment_id,
    display_order: image.display_order,
    ...(image.locale !== undefined ? { locale: image.locale } : {}),
  };
}
