import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently remove a category binding between a product and a category
 * (ai_commerce_product_category_bindings).
 *
 * This operation allows an authenticated seller to remove a category
 * association from one of their products. Authorization: Only the product's
 * seller (as determined by SellerPayload → ai_commerce_seller.buyer_id →
 * ai_commerce_products.seller_id) may delete the binding. Performs a hard
 * delete—category binding is fully erased (no soft delete in the schema). If
 * the binding does not exist for the provided product, an error is thrown. All
 * relevant errors (product not found, unauthorized, binding not found) are
 * surfaced as runtime exceptions.
 *
 * @param props - The argument object
 * @param props.seller - Authenticated seller user (payload)
 * @param props.productId - The UUID of the product for which the category
 *   binding should be removed
 * @param props.bindingId - The UUID of the product-category binding row to be
 *   removed
 * @returns Void
 * @throws {Error} When authorization fails, or product/binding does not exist
 *   or is not authorized
 */
export async function deleteaiCommerceSellerProductsProductIdCategoryBindingsBindingId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, bindingId } = props;

  // Step 1. Find the seller record by buyer_id, must be active (not deleted)
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id, deleted_at: null },
  });
  if (!sellerRecord) {
    throw new Error("Seller account not found or not active");
  }

  // Step 2. Find the product and check that it is owned by this seller
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new Error("Product not found");
  }
  if (product.seller_id !== sellerRecord.id) {
    throw new Error("Unauthorized: You do not own this product");
  }

  // Step 3. Find the category binding for this product, verify by bindingId and productId
  const binding =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: {
        id: bindingId,
        product_id: productId,
      },
    });
  if (!binding) {
    throw new Error("Category binding not found for this product");
  }

  // Step 4. Hard delete the binding
  await MyGlobal.prisma.ai_commerce_product_category_bindings.delete({
    where: { id: bindingId },
  });
}
