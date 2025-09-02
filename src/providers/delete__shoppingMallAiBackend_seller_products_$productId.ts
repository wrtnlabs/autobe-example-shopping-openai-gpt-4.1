import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Soft delete a product by setting its deleted_at timestamp, preserving for
 * audit, rollback, and compliance.
 *
 * This operation allows sellers to logically delete a product (soft-delete). It
 * sets the deleted_at field with the current timestamp, retaining the product
 * for regulatory evidence, compliance, and business rollback. The deleted
 * product remains queryable for audits but is hidden from all commerce-facing
 * listings and APIs. If the product is already deleted or cannot be found, an
 * error is thrown describing the reason.
 *
 * ⚠️ Enforcement Limitation: The Prisma schema does not include any reference
 * from product to seller (e.g., seller_id). As a result, the implementation
 * CANNOT strictly validate seller ownership of the product; all sellers would
 * be able to soft-delete any existing product. Proper authorization would
 * require linking the product to the seller.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller making the request (role-guard
 *   enforced)
 * @param props.productId - The unique identifier of the product to soft-delete
 * @returns Void (no output)
 * @throws {Error} If the product does not exist
 * @throws {Error} If the product has already been soft-deleted (deleted_at set)
 */
export async function delete__shoppingMallAiBackend_seller_products_$productId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId } = props;

  // Step 1: Fetch the product by its unique identifier
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
    });
  if (!product) throw new Error("Product not found");

  // Step 2: (Authorization Limitation) No seller_id on product, so cannot enforce strict seller-ownership check.

  // Step 3: Check if the product already has deleted_at (already soft-deleted)
  if (product.deleted_at) throw new Error("Product already deleted");

  // Step 4: Soft-delete the product by marking deleted_at (date-time string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_ai_backend_products.update({
    where: { id: productId },
    data: { deleted_at: now },
  });
  // No output for void return
}
