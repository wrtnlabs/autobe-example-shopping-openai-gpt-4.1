import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get details of a single comment for a review (ai_commerce_comments table).
 *
 * This endpoint retrieves the details for an identified comment that belongs to
 * a specific review. It ensures both reviewId and commentId exist and are
 * associated, handling authorization for sellers. Comments and reviews must not
 * be soft-deleted. Returns the complete IAiCommerceComment DTO with proper
 * date/time formatting, and correct handling of optional/nullable fields per
 * strict DTO conventions.
 *
 * @param props - Properties containing the authenticated seller payload, the
 *   reviewId, and commentId.
 * @param props.seller - Authenticated seller payload
 * @param props.reviewId - Unique identifier for the parent review
 * @param props.commentId - Unique identifier for the comment to retrieve
 * @returns IAiCommerceComment DTO mapped from the ai_commerce_comments entity.
 * @throws {Error} When the comment, review does not exist, is not associated,
 *   or is deleted.
 */
export async function getaiCommerceSellerReviewsReviewIdCommentsCommentId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { reviewId, commentId } = props;

  // Look up the comment (must belong to this review, not soft-deleted)
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      review_id: reviewId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }

  // Verify the review exists and itself is not soft-deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new Error("Review not found");
  }

  // Construct response, mapping null database values to undefined (optional fields)
  // and converting all Date fields to string & tags.Format<'date-time'>
  return {
    id: comment.id,
    author_id: comment.author_id,
    parent_comment_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
    bulletin_id: comment.bulletin_id === null ? undefined : comment.bulletin_id,
    inquiry_id: comment.inquiry_id === null ? undefined : comment.inquiry_id,
    review_id: comment.review_id === null ? undefined : comment.review_id,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null
        ? undefined
        : toISOStringSafe(comment.deleted_at),
  };
}
