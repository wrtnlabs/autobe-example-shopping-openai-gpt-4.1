import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Soft delete a product content entity associated with a specific product in
 * ai_commerce_product_contents (implemented as hard delete due to schema).
 *
 * This endpoint allows an authenticated seller to remove a single product
 * content entity, provided the seller owns the product. This is implemented as
 * a hard delete in the absence of a 'deleted_at' soft delete column. A
 * compliance audit log is created, containing a snapshot of the content before
 * deletion for legal and regulatory evidence. If the content does not exist, or
 * is not associated with the requested product, or if the seller does not own
 * the product, an error is thrown.
 *
 * @param props - Object containing the seller payload (authenticated), the
 *   productId, and the contentId to delete.
 * @param props.seller - The authenticated seller making the request
 * @param props.productId - The UUID of the product whose content is to be
 *   deleted
 * @param props.contentId - The UUID of the content entity to delete
 * @returns Void (204 No Content if successful)
 * @throws {Error} If the product does not exist, the seller does not own the
 *   product, the content does not exist, or the content is not associated with
 *   the product
 */
export async function deleteaiCommerceSellerProductsProductIdContentsContentId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  contentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate product ownership
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: props.productId },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new Error("Unauthorized to delete contents for this product");
  }

  // 2. Fetch the product content
  const content = await MyGlobal.prisma.ai_commerce_product_contents.findUnique(
    {
      where: { id: props.contentId },
    },
  );
  if (!content || content.product_id !== props.productId) {
    throw new Error("Content not found or not associated with this product");
  }

  // 3. Prepare audit log snapshot
  const beforeJson = JSON.stringify(content);
  const now = toISOStringSafe(new Date());

  // 4. Hard delete (no deleted_at field exists in this model)
  await MyGlobal.prisma.ai_commerce_product_contents.delete({
    where: { id: props.contentId },
  });

  // 5. Write compliance audit log
  await MyGlobal.prisma.ai_commerce_product_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: props.productId,
      event_type: "delete_content",
      actor_id: props.seller.id,
      before_json: beforeJson,
      after_json: null,
      created_at: now,
    },
  });
}
