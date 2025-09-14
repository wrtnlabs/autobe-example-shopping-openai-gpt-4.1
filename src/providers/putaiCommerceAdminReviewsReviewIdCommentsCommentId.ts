import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the content or status of an existing comment for a review.
 *
 * This function updates the specified ai_commerce_comments record belonging to
 * a given review, supporting updates to content and status fields. Only the
 * fields present in the request body are updated. The operation validates that
 * the comment exists, is not soft-deleted, and is associated with the specified
 * reviewId. Only a system administrator (admin) may perform this action. All
 * updates snapshot audit compliance and trigger notification or moderation
 * workflows as dictated by business rules. Date fields are returned in strict
 * ISO 8601 string format.
 *
 * @param props - Parameters for updating a comment
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.reviewId - UUID of the review the comment must belong to
 * @param props.commentId - UUID of the comment to update
 * @param props.body - Object specifying comment content or status changes
 * @returns The updated IAiCommerceComment object with all fields properly
 *   formatted
 * @throws {Error} If comment not found, soft-deleted, or review association
 *   does not match
 */
export async function putaiCommerceAdminReviewsReviewIdCommentsCommentId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { admin, reviewId, commentId, body } = props;
  // 1. Retrieve the existing comment to check existence, not soft-deleted
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) throw new Error("Comment not found or has been deleted.");
  if (comment.review_id !== reviewId)
    throw new Error("Comment does not belong to the specified review.");

  // 2. Prepare update object: only update body/status if supplied, always update updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData: {
    body?: string;
    status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (body.body !== undefined) updateData.body = body.body;
  if (body.status !== undefined) updateData.status = body.status;

  // 3. Update the comment
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: updateData,
  });

  // 4. Transform DB record to IAiCommerceComment structure, converting dates, handling null/undefined properly
  return {
    id: updated.id,
    author_id: updated.author_id,
    parent_comment_id: updated.parent_comment_id ?? undefined,
    bulletin_id: updated.bulletin_id ?? undefined,
    inquiry_id: updated.inquiry_id ?? undefined,
    review_id: updated.review_id ?? undefined,
    body: updated.body,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
