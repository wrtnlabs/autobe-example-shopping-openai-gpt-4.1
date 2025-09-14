import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update the content or status of an existing comment (ai_commerce_comments
 * table).
 *
 * Allows buyers to update their own comments on a specific review. This
 * operation updates the body or status of the selected comment (if provided),
 * ensuring the caller is the original author. All updates preserve audit fields
 * and return the updated comment entity.
 *
 * Business conditions enforced:
 *
 * - Only the original comment author (buyer) may edit their comment
 * - Comment must exist and be associated with the given review
 * - Updates only apply to provided fields (body, status) and always bump
 *   updated_at
 * - Soft-deleted comments cannot be edited (for compliance)
 * - Side effects (audit, notification) are triggered via other workflow layers
 *
 * @param props - Request properties
 * @param props.buyer - Authenticated buyer making the edit (role: buyer)
 * @param props.reviewId - The review the comment belongs to (UUID)
 * @param props.commentId - The comment to update (UUID)
 * @param props.body - Fields to update: IAiCommerceComment.IUpdate (body and/or
 *   status)
 * @returns The updated comment entity after applying changes
 * @throws {Error} If the comment is not found, not owned by buyer, or is
 *   soft-deleted
 */
export async function putaiCommerceBuyerReviewsReviewIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { buyer, reviewId, commentId, body } = props;

  // Fetch comment, ensure it exists, matches review, not soft-deleted
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: { id: commentId, review_id: reviewId, deleted_at: null },
  });
  if (comment == null)
    throw new Error("Comment not found for this review or already deleted");
  if (comment.author_id !== buyer.id)
    throw new Error(
      "Forbidden: Only the original author can edit their comment",
    );

  const currentTime = toISOStringSafe(new Date());
  // Prepare and run update with only supplied fields
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: {
      ...(body.body !== undefined && { body: body.body }),
      ...(body.status !== undefined && { status: body.status }),
      updated_at: currentTime,
    },
  });

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
