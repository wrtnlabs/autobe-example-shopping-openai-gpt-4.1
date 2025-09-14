import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Remove a product's binding to a section
 * (ai_commerce_product_section_bindings).
 *
 * This endpoint allows an authenticated seller to hard-delete a merchandising
 * binding between their product and a section, thus removing the product from
 * the section. Hard delete is enforced (no soft delete field). Authorization
 * ensures the seller owns the product linked to the binding. Both product and
 * binding must exist, and only the owner may remove the binding. Deletion is
 * immediate and permanent.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the operation
 * @param props.productId - The UUID of the product whose section binding is to
 *   be removed
 * @param props.bindingId - The UUID of the section binding to permanently
 *   remove
 * @returns Void
 * @throws {Error} If the binding does not exist or the seller does not own the
 *   product
 */
export async function deleteaiCommerceSellerProductsProductIdSectionBindingsBindingId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, bindingId } = props;

  // 1. Ensure the binding exists and matches the productId
  const binding =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findUnique({
      where: { id: bindingId },
    });
  if (!binding || binding.product_id !== productId) {
    throw new Error("Binding not found");
  }

  // 2. Fetch the product and cross-check seller ownership by buyer_id
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
  });
  if (!product) throw new Error("Product not found");
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findUnique({
    where: { id: product.seller_id },
  });
  if (!sellerRecord || sellerRecord.buyer_id !== seller.id) {
    throw new Error("Forbidden: This product does not belong to you");
  }

  // 3. Hard delete the binding record
  await MyGlobal.prisma.ai_commerce_product_section_bindings.delete({
    where: { id: bindingId },
  });
}
