import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an image's metadata for a specific product using
 * ai_commerce_product_images.
 *
 * This operation allows administrators to update image metadata (linked
 * attachment, display order, locale) for a product. It checks that the image
 * exists and belongs to the specified product, verifies admin privileges, and
 * updates only the fields provided in the request body. Only metadata is
 * changed—image file data itself is not modified.
 *
 * @param props - The operation input object
 * @param props.admin - The authenticated admin user performing this action
 * @param props.productId - The product's unique identifier (UUID) to which the
 *   image must belong
 * @param props.imageId - The image record identifier to be updated (UUID)
 * @param props.body - The update payload with any or all of: attachment_id,
 *   display_order, locale
 * @returns The updated product image's metadata
 * @throws {Error} If the image does not exist or does not belong to the
 *   specified product
 */
export async function putaiCommerceAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IAiCommerceProductImage.IUpdate;
}): Promise<IAiCommerceProductImage> {
  const { productId, imageId, body } = props;
  const image = await MyGlobal.prisma.ai_commerce_product_images.findUnique({
    where: { id: imageId },
  });
  if (image === null) {
    throw new Error("Product image not found");
  }
  if (image.product_id !== productId) {
    throw new Error("Image does not belong to specified product");
  }

  const updated = await MyGlobal.prisma.ai_commerce_product_images.update({
    where: { id: imageId },
    data: {
      attachment_id:
        typeof body.attachment_id !== "undefined"
          ? body.attachment_id
          : undefined,
      display_order:
        typeof body.display_order !== "undefined"
          ? body.display_order
          : undefined,
      locale: typeof body.locale !== "undefined" ? body.locale : undefined,
    },
  });
  return {
    id: updated.id,
    product_id: updated.product_id,
    attachment_id: updated.attachment_id,
    display_order: updated.display_order,
    locale: typeof updated.locale === "undefined" ? undefined : updated.locale,
  };
}
