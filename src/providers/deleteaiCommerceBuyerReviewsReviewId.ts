import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Logically deletes a review by marking its deleted_at timestamp.
 *
 * This operation is restricted to the buyer who authored the review. It
 * performs a soft delete (logical deletion), ensuring that deleted reviews are
 * retained for legal, compliance, and audit purposes per platform guidelines.
 * If the review does not exist, is already deleted, or is not owned by the
 * calling buyer, an error is thrown.
 *
 * @param props - Request properties
 * @param props.buyer - The authenticated buyer making the request (must be the
 *   original author of the review)
 * @param props.reviewId - Unique identifier for the review to be deleted
 * @returns Void
 * @throws {Error} If the review does not exist, is already deleted, or the user
 *   is not the author
 */
export async function deleteaiCommerceBuyerReviewsReviewId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, reviewId } = props;

  // Fetch the review by ID (only fetch minimal fields required)
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
      author_id: true,
      deleted_at: true,
    },
  });

  // Not found or already deleted
  if (!review || review.deleted_at !== null) {
    throw new Error("Review not found or already deleted");
  }

  // Ownership enforcement
  if (review.author_id !== buyer.id) {
    throw new Error(
      "Forbidden: Only the original author may delete this review",
    );
  }

  // Soft delete (update deleted_at)
  await MyGlobal.prisma.ai_commerce_reviews.update({
    where: { id: reviewId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
