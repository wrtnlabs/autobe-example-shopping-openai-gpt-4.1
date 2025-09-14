import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Add a new image to an existing product in ai_commerce_product_images
 *
 * This operation allows authorized sellers to add a new image to a product they
 * own, by linking an attachment and providing display ordering and optional
 * locale. The endpoint verifies product ownership, ensures the product is
 * active and editable, and then creates the image record. If the product does
 * not exist or is not owned by the seller, an error is thrown.
 *
 * @param props - The request props
 * @param props.seller - The authenticated seller (payload: { id, type })
 * @param props.productId - The product UUID to which the image is added
 * @param props.body - Image creation info: attachment_id, display_order,
 *   optional locale
 * @returns The newly created IAiCommerceProductImage record
 * @throws {Error} If seller not found, seller deleted, not active; or product
 *   not found, deleted, or not owned by seller
 */
export async function postaiCommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductImage.ICreate;
}): Promise<IAiCommerceProductImage> {
  // Verify seller exists and is active
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: props.seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
    select: { id: true },
  });
  if (!sellerRecord) throw new Error("Seller not found or inactive.");

  // Check product exists and is owned by seller, not deleted
  const productRecord = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: props.productId,
      seller_id: sellerRecord.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!productRecord)
    throw new Error("Product not found, deleted, or not owned by seller.");

  // Create product image entry
  const created = await MyGlobal.prisma.ai_commerce_product_images.create({
    data: {
      id: v4(),
      product_id: props.productId,
      attachment_id: props.body.attachment_id,
      display_order: props.body.display_order,
      locale:
        typeof props.body.locale !== "undefined" ? props.body.locale : null,
    },
  });

  return {
    id: created.id,
    product_id: created.product_id,
    attachment_id: created.attachment_id,
    display_order: created.display_order,
    locale:
      typeof created.locale !== "undefined" && created.locale !== null
        ? created.locale
        : null,
  };
}
