import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Remove a highlighted product from discovery curation registry.
 *
 * Performs a hard (physical) deletion on a highlighted product record in
 * ai_commerce_highlighted_products, because the schema does not support soft
 * delete. Only the seller who originally created the highlight may perform this
 * action. Attempts to delete a non-existent record, or by a seller who is not
 * the creator, will result in an error. Audit logging of this event is
 * recommended in the business layer (not implemented here).
 *
 * @param props - Object containing all necessary parameters:
 * @param props.seller - The authenticated seller making the request (must be
 *   the original creator).
 * @param props.highlightedProductId - UUID of the highlighted product to
 *   delete.
 * @returns Void
 * @throws {Error} When the highlighted product cannot be found or the seller
 *   lacks permission.
 */
export async function deleteaiCommerceSellerHighlightedProductsHighlightedProductId(props: {
  seller: SellerPayload;
  highlightedProductId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, highlightedProductId } = props;

  // Step 1: Fetch the highlighted product (must exist)
  const highlighted =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findUnique({
      where: { id: highlightedProductId },
    });
  if (!highlighted) {
    throw new Error("Highlighted product not found");
  }

  // Step 2: Only the creator (seller) can delete their own highlight
  if (highlighted.highlighted_by !== seller.id) {
    throw new Error(
      "Unauthorized: Only the seller who created this highlight can delete it",
    );
  }

  // Step 3: Hard delete the record (no soft delete field exists)
  await MyGlobal.prisma.ai_commerce_highlighted_products.delete({
    where: { id: highlightedProductId },
  });

  // Step 4: Audit log should be performed here in business layer (not in this function)
  return;
}
