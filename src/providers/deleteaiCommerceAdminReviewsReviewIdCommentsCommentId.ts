import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Logically delete (soft delete) a comment from a review (ai_commerce_comments
 * table).
 *
 * This operation allows an authenticated admin to perform a soft-delete
 * (logical delete) on a comment associated with a specific review by marking
 * the comment's deleted_at field. The deletion is audited for compliance,
 * preserving both pre- and post-delete snapshots.
 *
 * @param props - Properties for the deletion request
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.reviewId - Unique identifier for the parent review
 * @param props.commentId - Unique identifier for the comment to logically
 *   delete
 * @returns Void
 * @throws {Error} If the comment does not exist, is not attached to the review,
 *   or is already deleted
 */
export async function deleteaiCommerceAdminReviewsReviewIdCommentsCommentId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, reviewId, commentId } = props;

  // 1. Find the comment by id/reviewId and ensure not already soft-deleted
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

  // 2. Soft delete: update deleted_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });

  // 3. Audit log: capture before and after state
  const beforeState = JSON.stringify(comment);
  const afterState = JSON.stringify({ ...comment, deleted_at: now });
  await MyGlobal.prisma.ai_commerce_ugc_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ugc_entity_comment_id: commentId,
      actor_id: admin.id,
      action_type: "delete",
      action_result: "soft_delete",
      before_state: beforeState,
      after_state: afterState,
      created_at: now,
    },
  });
}
