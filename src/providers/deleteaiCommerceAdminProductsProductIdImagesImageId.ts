import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a specific product image from ai_commerce_product_images
 *
 * This operation permanently deletes a product image record (hard-delete), if
 * it belongs to the target product and is not already deleted. (Note: Soft
 * delete with deleted_at is not possible — field does not exist in schema.)
 * Access is restricted to system administrators. The function ensures the image
 * exists and belongs to the given product before deleting. On success, nothing
 * is returned.
 *
 * @param props - The input parameter object
 * @param props.admin - The authenticated administrator performing this
 *   operation
 * @param props.productId - The UUID of the product that owns the image
 * @param props.imageId - The UUID of the image to delete
 * @returns Void
 * @throws {Error} If the product image does not exist or belongs to a different
 *   product
 */
export async function deleteaiCommerceAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { productId, imageId } = props;
  const image = await MyGlobal.prisma.ai_commerce_product_images.findFirst({
    where: {
      id: imageId,
      product_id: productId,
    },
  });
  if (!image) throw new Error("Product image not found");
  await MyGlobal.prisma.ai_commerce_product_images.delete({
    where: { id: imageId },
  });
}
