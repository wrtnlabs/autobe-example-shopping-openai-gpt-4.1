import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update the content or status of an existing comment (ai_commerce_comments
 * table).
 *
 * Allows an authenticated seller (comment author) to update their own comment's
 * content or status, if it belongs to the given review. No native Date, as, nor
 * skipped validation. Strict authorization and conversion of all dates to
 * branded string types for the API.
 *
 * @param props - Parameters for the update
 * @param props.seller - Authenticated seller payload
 * @param props.reviewId - The associated review ID
 * @param props.commentId - The comment ID to update
 * @param props.body - Update fields (body, status, visibility)
 * @returns The updated comment as IAiCommerceComment
 * @throws {Error} If comment/review is not found or seller is not author
 */
export async function putaiCommerceSellerReviewsReviewIdCommentsCommentId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { seller, reviewId, commentId, body } = props;
  const comment = await MyGlobal.prisma.ai_commerce_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new Error("Comment not found");
  if (comment.review_id !== reviewId)
    throw new Error("Comment does not belong to the specified review");
  if (comment.author_id !== seller.id)
    throw new Error("You are not authorized to edit this comment");
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: {
      body: body.body ?? undefined,
      status: body.status ?? undefined,
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
