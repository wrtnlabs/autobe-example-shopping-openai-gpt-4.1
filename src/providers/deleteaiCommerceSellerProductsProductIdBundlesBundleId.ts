import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Delete (soft/hard) a product bundle from a product
 * (ai_commerce_product_bundles table).
 *
 * This operation deletes (soft deletes) a bundle from a product, verifying that
 * the bundle is present, has not already been deleted, and that the seller owns
 * the product. The bundle's deleted_at field is set to the current timestamp to
 * enforce a logical (soft) deletion. If the bundle does not exist or is already
 * deleted, an error is thrown. If the seller does not own the product, an
 * authorization error is thrown.
 *
 * @param props - Request data
 * @param props.seller - Authenticated seller's payload (must own the product)
 * @param props.productId - UUID of parent product
 * @param props.bundleId - UUID of bundle to delete
 * @returns Void
 * @throws {Error} If the bundle does not exist, is already deleted, or the
 *   seller does not own the product
 */
export async function deleteaiCommerceSellerProductsProductIdBundlesBundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the target bundle (must be non-deleted and under the given product)
  const bundle = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
    where: {
      id: props.bundleId,
      parent_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      parent_product_id: true,
    },
  });
  if (!bundle) {
    throw new Error("Bundle not found or already deleted");
  }

  // Step 2: Confirm product exists and is owned by this seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: props.productId,
    },
    select: {
      seller_id: true,
    },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new Error("Unauthorized - you do not own this product");
  }

  // Step 3: Perform soft delete (set the deleted_at timestamp)
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_product_bundles.update({
    where: { id: props.bundleId },
    data: { deleted_at: deletedAt },
  });

  // (Optional: Audit log could be added here if schema provided)
}
