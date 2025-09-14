import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Logically deletes (soft deletes) a comment from a review
 * (ai_commerce_comments).
 *
 * This operation sets the deleted_at timestamp for the specified comment,
 * ensuring the action is audit-trail compliant. Only the comment's original
 * author (by user ID) is permitted to perform the deletion. An audit log entry
 * is recorded containing before/after snapshots for compliance. If the comment
 * is missing, already deleted, or not owned by the seller, an error is thrown.
 *
 * @param props - Seller: The authenticated seller payload (must match
 *   author_id) reviewId: The parent review identifier commentId: The unique
 *   comment identifier to delete
 * @returns Void
 * @throws {Error} If the comment is not found, already deleted, or not owned by
 *   the seller
 */
export async function deleteaiCommerceSellerReviewsReviewIdCommentsCommentId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, reviewId, commentId } = props;
  // Fetch and validate ownership and soft-delete status
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      review_id: reviewId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (comment.deleted_at !== null && comment.deleted_at !== undefined) {
    throw new Error("Comment already deleted");
  }
  if (comment.author_id !== seller.id) {
    throw new Error("Unauthorized: Only the author may delete this comment.");
  }
  // Snapshot previous state
  const before_state = JSON.stringify(comment);
  // Perform soft delete
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });
  // Snapshot new state
  const deletedComment = await MyGlobal.prisma.ai_commerce_comments.findUnique({
    where: { id: commentId },
  });
  const after_state = JSON.stringify(deletedComment);
  // Audit log: before/after and context
  await MyGlobal.prisma.ai_commerce_ugc_audit_logs.create({
    data: {
      id: v4(),
      ugc_entity_comment_id: commentId,
      ugc_entity_review_id: reviewId,
      actor_id: seller.id,
      action_type: "delete",
      action_result: "success",
      before_state,
      after_state,
      created_at: now,
    },
  });
  return;
}
