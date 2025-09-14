import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Logically delete (soft delete) a comment from a review (ai_commerce_comments
 * table).
 *
 * This operation allows an authenticated buyer to logically delete (soft
 * delete) their own comment on a review. The system marks the comment as
 * deleted by setting the deleted_at field to the current timestamp (string &
 * tags.Format<'date-time'>), preserving evidence and history as required by
 * platform UGC policies and compliance requirements.
 *
 * The operation validates that the comment exists, is not already deleted, is
 * attached to the specified review, and is owned by the requesting buyer. Upon
 * success, an audit log entry is created capturing both the before and after
 * state. Comments deleted through this operation are no longer returned in
 * regular user queries but remain available for admin/audit purposes, as per
 * compliance policies. Hard deletion is never performed by this endpoint.
 *
 * @param props - Request object
 * @param props.buyer - Authenticated buyer performing the operation
 * @param props.reviewId - Review UUID to which the comment belongs
 * @param props.commentId - Comment UUID to be deleted
 * @returns Void
 * @throws {Error} If the comment does not exist, is already deleted, or is not
 *   owned by the buyer
 */
export async function deleteaiCommerceBuyerReviewsReviewIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, reviewId, commentId } = props;

  // Step 1: Find the comment (not already deleted, must match review)
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      review_id: reviewId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }
  if (comment.author_id !== buyer.id) {
    throw new Error("Unauthorized: Only the author may delete this comment");
  }

  // Prepare deletion timestamp (ISO8601 string with correct branding)
  const deletionTimestamp = toISOStringSafe(new Date());

  // Step 2: Perform soft delete (set deleted_at)
  await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: { deleted_at: deletionTimestamp },
  });

  // Step 3: Write audit log (full before/after state)
  await MyGlobal.prisma.ai_commerce_ugc_audit_logs.create({
    data: {
      id: v4(),
      ugc_entity_comment_id: commentId,
      ugc_entity_review_id: reviewId,
      actor_id: buyer.id,
      action_type: "soft_delete",
      action_result: "success",
      before_state: JSON.stringify(comment),
      after_state: JSON.stringify({
        ...comment,
        deleted_at: deletionTimestamp,
      }),
      created_at: deletionTimestamp,
    },
  });
  // All done. Returns void.
}
