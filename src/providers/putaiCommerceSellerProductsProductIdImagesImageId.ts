import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an image's metadata for a specific product using
 * ai_commerce_product_images
 *
 * Permits the owner (seller) of the product to update fields for a product
 * image such as the linked attachment (file), display order, or locale. Based
 * on the IAiCommerceProductImage.IUpdate DTO, the request supports full or
 * partial field replacement. Only the seller who owns the product can update
 * its images. Admin role is not handled in this provider. This function is not
 * intended for modifying image content but for updating product image metadata
 * only.
 *
 * @param props - Parameters for updating the product image
 * @param props.seller - Authenticated seller making the request
 * @param props.productId - UUID of the product to which this image belongs
 * @param props.imageId - UUID of the image record to modify
 * @param props.body - The fields to update on the image (partial update
 *   allowed)
 * @returns The updated product image entity reflecting new metadata
 * @throws {Error} If the image, product, or seller is not found or ownership
 *   check fails
 */
export async function putaiCommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IAiCommerceProductImage.IUpdate;
}): Promise<IAiCommerceProductImage> {
  // Step 1: Fetch product image and validate it exists for the given product
  const image = await MyGlobal.prisma.ai_commerce_product_images.findFirst({
    where: { id: props.imageId, product_id: props.productId },
  });
  if (!image) throw new Error("Product image not found for the given product.");

  // Step 2: Lookup the product and verify seller is the owner
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: props.productId },
  });
  if (!product) throw new Error("Product not found.");

  // Step 3: Get seller entity using buyer_id from seller payload
  const seller = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: props.seller.id },
  });
  if (!seller)
    throw new Error("Seller profile not found for the authenticated user.");
  if (product.seller_id !== seller.id)
    throw new Error("Unauthorized: you do not own this product.");

  // Step 4: Prepare update data, including only supplied (non-undefined) fields
  const updateData: IAiCommerceProductImage.IUpdate = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "attachment_id")) {
    updateData.attachment_id = props.body.attachment_id;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "display_order")) {
    updateData.display_order = props.body.display_order;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "locale")) {
    updateData.locale = props.body.locale;
  }

  // Step 5: Update the image metadata, fetch updated record
  const updated = await MyGlobal.prisma.ai_commerce_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });

  // Step 6: Map output to strictly match response DTO
  const output: IAiCommerceProductImage = {
    id: updated.id,
    product_id: updated.product_id,
    attachment_id: updated.attachment_id,
    display_order: updated.display_order,
    // locale is optional | null | undefined
    ...(updated.locale !== undefined ? { locale: updated.locale } : {}),
  };
  return output;
}
