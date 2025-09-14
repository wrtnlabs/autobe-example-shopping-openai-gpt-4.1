import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get details of a single comment for a review (ai_commerce_comments table).
 *
 * This function retrieves the details for a comment belonging to a specific
 * review from the ai_commerce_comments table. Both reviewId and commentId must
 * match and reference non-deleted records. The response includes author,
 * content, status, timestamps, and related fields. Throws if the comment is not
 * found, is not associated with the given review, or the review has been
 * soft-deleted.
 *
 * @param props - Parameters for the query
 * @param props.buyer - Authenticated buyer payload
 * @param props.reviewId - Unique identifier of the parent review
 * @param props.commentId - Unique identifier of the comment to retrieve
 * @returns The IAiCommerceComment entity with all associated fields
 * @throws {Error} If the comment does not exist, is not associated with the
 *   review, or the review is deleted
 */
export async function getaiCommerceBuyerReviewsReviewIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { reviewId, commentId } = props;

  // Find the comment belonging to the specific review, not deleted
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      review_id: reviewId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error(
      "Comment not found or not associated with the given review",
    );
  }

  // Check parent review exists and is not deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new Error("Review not found or deleted");
  }

  // Build the DTO
  return {
    id: comment.id,
    author_id: comment.author_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    bulletin_id: comment.bulletin_id ?? undefined,
    inquiry_id: comment.inquiry_id ?? undefined,
    review_id: comment.review_id ?? undefined,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
