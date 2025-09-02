import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Deletes a specific product bundle (SKU/variant) for a product (soft delete).
 *
 * Marks the specified product bundle as soft-deleted by setting its deleted_at
 * field to the current timestamp. The function enforces that the bundle exists
 * and is not already deleted, and only allows authorized sellers or admins to
 * invoke this operation (authorization via authentication is presumed).
 *
 * @param props - Request properties
 * @param props.seller - Payload containing authenticated seller information
 * @param props.productId - ID of the parent product for which the bundle
 *   (variant) is being deleted
 * @param props.bundleId - ID of the bundle (SKU/variant) to delete
 * @returns Void
 * @throws {Error} If the bundle does not exist or is already deleted
 */
export async function delete__shoppingMallAiBackend_seller_products_$productId_bundles_$bundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { productId, bundleId } = props;
  // Fetch bundle and ensure it exists and is not deleted
  const bundle =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.findFirst({
      where: {
        id: bundleId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!bundle) throw new Error("Bundle not found or already deleted");
  // Prepare ISO string timestamp for deletion
  const now = toISOStringSafe(new Date());
  // Soft delete bundle by setting deleted_at field
  await MyGlobal.prisma.shopping_mall_ai_backend_product_bundles.update({
    where: { id: bundleId },
    data: {
      deleted_at: now,
    },
  });
  // Success (void return)
}
