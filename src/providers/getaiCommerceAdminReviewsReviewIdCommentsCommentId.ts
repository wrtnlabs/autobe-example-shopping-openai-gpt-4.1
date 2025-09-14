import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details of a single comment for a review (ai_commerce_comments table).
 *
 * Retrieves comment details by commentId belonging to the specified reviewId.
 * Ensures the review exists and is active (not deleted), and validates the
 * comment's association and existence. Intended for admin users with full
 * access rights, including moderation and compliance audits, regardless of
 * comment deletion state.
 *
 * @param props - Contains the authenticated admin user, reviewId, and commentId
 *   path parameters.
 * @param props.admin - The authenticated admin user performing the operation.
 * @param props.reviewId - The unique identifier for the parent review.
 * @param props.commentId - The unique identifier for the requested comment.
 * @returns The IAiCommerceComment entity with all fields populated and proper
 *   type conversions.
 * @throws {Error} If the review does not exist, is deleted, or the comment does
 *   not exist or is not associated with the review.
 */
export async function getaiCommerceAdminReviewsReviewIdCommentsCommentId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { reviewId, commentId } = props;

  // Ensure the review exists and is not deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: { id: reviewId, deleted_at: null },
  });
  if (!review) throw new Error("Review not found or has been deleted");

  // Ensure the comment exists and is associated with the review
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: { id: commentId, review_id: reviewId },
  });
  if (!comment)
    throw new Error("Comment not found or not associated with this review");

  // Return as IAiCommerceComment, handling all nullable/optional fields and datetime formats
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
