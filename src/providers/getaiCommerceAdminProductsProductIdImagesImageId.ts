import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a product image for a given productId and imageId from
 * ai_commerce_product_images
 *
 * This operation fetches a single product image, including its display order,
 * locale metadata, and attachment file reference, as defined in the
 * ai_commerce_product_images schema. Admin access is required. It is used for
 * scenarios such as image gallery display, admin/seller review, and product
 * image management. Throws if no such image is found for the specified
 * product.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated administrator making the request
 * @param props.productId - UUID of the parent product
 * @param props.imageId - UUID of the product image record
 * @returns The product image record with all fields present
 * @throws {Error} If no product image is found for the given productId/imageId
 */
export async function getaiCommerceAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductImage> {
  const { productId, imageId } = props;
  const image = await MyGlobal.prisma.ai_commerce_product_images.findFirst({
    where: {
      id: imageId,
      product_id: productId,
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
    throw new Error("Product image not found");
  }
  return {
    id: image.id,
    product_id: image.product_id,
    attachment_id: image.attachment_id,
    display_order: image.display_order,
    locale: image.locale ?? undefined,
  };
}
