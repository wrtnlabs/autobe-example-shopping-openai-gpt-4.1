import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detail of a single comment for a specific inquiry (ai_commerce_comments).
 *
 * Fetches a single comment by its commentId within the context of an inquiry
 * (inquiryId). Ensures the referenced comment not only exists, but is linked to
 * the provided inquiry. Returns all primary fields, handling nullable/optional
 * relationships and date conversions.
 *
 * Authorization: Admin authentication required (validated by decorator). No
 * further privilege checks required for admins.
 *
 * @param props - Function parameters
 * @param props.admin - The authenticated admin (authorization role enforced)
 * @param props.inquiryId - The unique identifier of the parent inquiry
 * @param props.commentId - The unique identifier of the comment to retrieve
 * @returns {Promise<IAiCommerceComment>} The comment with all detail fields
 *   populated, or throws Error if not found under the given inquiryId
 * @throws {Error} If no such comment exists for the given inquiryId and
 *   commentId
 */
export async function getaiCommerceAdminInquiriesInquiryIdCommentsCommentId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceComment> {
  const { inquiryId, commentId } = props;
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
    },
    select: {
      id: true,
      author_id: true,
      parent_comment_id: true,
      bulletin_id: true,
      inquiry_id: true,
      review_id: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!comment) throw new Error("Comment not found for given inquiry");
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
