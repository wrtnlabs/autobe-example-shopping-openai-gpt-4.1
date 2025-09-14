import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Delete (soft or hard) a product variant from a seller's product
 * (ai_commerce_product_variants table).
 *
 * This operation marks a specific product variant as deleted by setting its
 * deleted_at field (soft delete). Only the seller that owns the parent product
 * may perform this action. Deletion is blocked if the variant is referenced in
 * active (non-deleted) order items.
 *
 * @param props -
 *
 *   - Seller: Authenticated seller payload (authorization required)
 *   - ProductId: The product to which this variant belongs (UUID)
 *   - VariantId: The variant to delete (UUID)
 *
 * @returns Void
 * @throws {Error} If variant does not exist, is already deleted, product does
 *   not belong to seller, or is referenced in active orders.
 */
export async function deleteaiCommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, variantId } = props;

  // 1. Fetch the variant, only if it exists and is not already deleted
  const variant = await MyGlobal.prisma.ai_commerce_product_variants.findFirst({
    where: {
      id: variantId,
      product_id: productId,
      deleted_at: null,
    },
  });
  if (!variant) {
    throw new Error("Variant not found or already deleted.");
  }

  // 2. Fetch the parent product and confirm seller ownership
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
  });
  if (!product || product.seller_id !== seller.id) {
    throw new Error("Unauthorized: product does not belong to this seller.");
  }

  // 3. Ensure variant is not referenced in any active (non-deleted) order item
  const orderItemExists =
    await MyGlobal.prisma.ai_commerce_order_items.findFirst({
      where: {
        product_variant_id: variantId,
        deleted_at: null,
      },
    });
  if (orderItemExists) {
    throw new Error("Cannot delete a variant referenced in active orders.");
  }

  // 4. Soft delete (set deleted_at to current time as ISO8601 string)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ai_commerce_product_variants.update({
    where: { id: variantId },
    data: { deleted_at: deletedAt },
  });
}
