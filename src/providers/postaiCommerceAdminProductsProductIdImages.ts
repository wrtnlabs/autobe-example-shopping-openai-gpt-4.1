import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Add a new image to an existing product in ai_commerce_product_images
 *
 * This endpoint allows an admin user to associate a new image (by attachment
 * reference, order, locale) with an existing product in the platform catalog.
 * It verifies the product exists and then creates an image row, returning the
 * created image entity for UI consumption.
 *
 * @param props - The request properties object
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.productId - UUID of the product to which the image is being
 *   added
 * @param props.body - Image creation data, including attachment_id,
 *   display_order, and optional locale
 * @returns The created product image record, strictly conforming to
 *   IAiCommerceProductImage
 * @throws {Error} If the product does not exist, or if database errors occur
 */
export async function postaiCommerceAdminProductsProductIdImages(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductImage.ICreate;
}): Promise<IAiCommerceProductImage> {
  const { admin, productId, body } = props;

  // Ensure the target product exists
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  // Generate new image record ID
  const id = v4();

  // Insert image record
  const created = await MyGlobal.prisma.ai_commerce_product_images.create({
    data: {
      id: id,
      product_id: productId,
      attachment_id: body.attachment_id,
      display_order: body.display_order,
      locale: body.locale ?? null,
    },
    select: {
      id: true,
      product_id: true,
      attachment_id: true,
      display_order: true,
      locale: true,
    },
  });

  // Compose response matching IAiCommerceProductImage
  return {
    id: created.id,
    product_id: created.product_id,
    attachment_id: created.attachment_id,
    display_order: created.display_order,
    locale: created.locale ?? undefined,
  };
}
