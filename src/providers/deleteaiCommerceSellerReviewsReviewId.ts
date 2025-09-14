import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Logically delete a product review by marking it as deleted (soft delete).
 *
 * This operation lets an authenticated seller logically delete a review on one
 * of their own products, as per UGC retention/audit platform guidelines. Only
 * the product's seller may perform this operation. The review is not physically
 * removed, but its `deleted_at` field is set to the current time, making it
 * unavailable for normal queries but retained for forensic and legal audit.
 *
 * Authorization: Only the seller responsible for the product associated with
 * the review can perform deletion. Sellers cannot delete reviews for products
 * they do not own.
 *
 * Error behavior:
 *
 * - Throws Error("Review not found") if no review with the given id exists.
 * - Throws Error("Review already deleted") if the review is already logically
 *   deleted.
 * - Throws Error("Associated order item not found") if the underlying order item
 *   for the review is missing.
 * - Throws Error("Unauthorized: cannot delete review of product not owned by
 *   seller") if the seller does not own the product associated with the
 *   review.
 *
 * All timestamps and IDs are handled as strings (never native Date) and all
 * UUID and date-time values follow strict branding.
 *
 * @param props - Object
 * @param props.seller - Authenticated seller payload (role: seller)
 * @param props.reviewId - Unique identifier for the review to be logically
 *   deleted (UUID)
 * @returns Void
 * @throws {Error} - See error behavior above
 */
export async function deleteaiCommerceSellerReviewsReviewId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, reviewId } = props;

  // Step 1: Fetch the review, ensure it exists and is not already soft-deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findUnique({
    where: { id: reviewId },
  });
  if (!review) throw new Error("Review not found");
  if (review.deleted_at !== null) throw new Error("Review already deleted");

  // Step 2: Fetch the associated order item
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findUnique({
    where: { id: review.order_item_id },
  });
  if (!orderItem) throw new Error("Associated order item not found");

  // Step 3: Find the seller record for the current session (seller.id = buyer_id)
  const sellerRecord = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
  });
  if (!sellerRecord) throw new Error("Seller record not found");

  // Step 4: Only the seller who owns the product may delete this review
  if (!orderItem.seller_id || orderItem.seller_id !== sellerRecord.id) {
    throw new Error(
      "Unauthorized: cannot delete review of product not owned by seller",
    );
  }

  // Step 5: Soft delete (set deleted_at string, never Date type present)
  await MyGlobal.prisma.ai_commerce_reviews.update({
    where: { id: reviewId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
