import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Erase a product-tag binding from the platform.
 *
 * This operation permanently deletes the association between a product and a
 * tag in the ai_commerce_product_tags table. Only the seller who owns the
 * product may perform this operation. Upon successful deletion, the association
 * is lost and must be re-established to restore it. The operation is
 * irreversible and intended for compliance, data correction, or business
 * context changes.
 *
 * @param props - Function parameters
 * @param props.seller - The authenticated seller performing the operation
 * @param props.productTagId - The unique identifier of the product-tag mapping
 *   to be erased
 * @returns Void
 * @throws {Error} If the product-tag binding does not exist
 * @throws {Error} If the product does not exist
 * @throws {Error} If the seller does not own the product for the mapping
 */
export async function deleteaiCommerceSellerProductTagsProductTagId(props: {
  seller: SellerPayload;
  productTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the product-tag binding
  const productTag = await MyGlobal.prisma.ai_commerce_product_tags.findUnique({
    where: { id: props.productTagId },
  });
  if (!productTag) {
    throw new Error("Invalid product-tag binding id");
  }
  // Fetch the product for seller ownership check
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productTag.ai_commerce_product_id },
    select: { seller_id: true },
  });
  if (!product) {
    throw new Error("Product for product-tag mapping does not exist");
  }
  // Authorization: verify seller is the owner
  if (product.seller_id !== props.seller.id) {
    throw new Error(
      "Unauthorized: Only the owner seller can erase product-tag mapping",
    );
  }
  // Hard delete the binding
  await MyGlobal.prisma.ai_commerce_product_tags.delete({
    where: { id: props.productTagId },
  });
}
