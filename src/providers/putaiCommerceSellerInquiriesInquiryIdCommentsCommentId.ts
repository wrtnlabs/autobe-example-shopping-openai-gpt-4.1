import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific comment for an inquiry (ai_commerce_comments).
 *
 * This endpoint allows the comment author (authenticated seller) to edit their
 * own comment under a specific inquiry. It strictly enforces that only the
 * author can update, and that the comment belongs to the correct inquiry. Only
 * the allowed fields (body, status) can be modified. Revision/audit logic is
 * not implemented here and should be handled elsewhere if needed.
 *
 * @param props - Object containing seller payload, inquiryId, commentId, and
 *   body
 * @param props.seller - The authenticated seller performing the update (must
 *   match comment author)
 * @param props.inquiryId - The unique identifier of the inquiry containing the
 *   comment
 * @param props.commentId - The unique identifier of the comment to update
 * @param props.body - The fields of the comment to update (body, status)
 * @returns The updated comment with all fields mapped to the DTO type
 * @throws {Error} If comment or inquiry does not exist, or the seller is not
 *   the author
 */
export async function putaiCommerceSellerInquiriesInquiryIdCommentsCommentId(props: {
  seller: SellerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { seller, inquiryId, commentId, body } = props;

  // Fetch the target comment
  const comment = await MyGlobal.prisma.ai_commerce_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new Error("Comment not found");

  // Authorization: must be author
  if (comment.author_id !== seller.id)
    throw new Error("Unauthorized: Cannot update another seller's comment");

  // Inquiry linkage check
  if (!comment.inquiry_id || comment.inquiry_id !== inquiryId) {
    throw new Error("Comment does not belong to the specified inquiry");
  }

  // Only update fields provided in body (body, status). updated_at must be refreshed.
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: {
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      updated_at: now,
    },
  });

  // Return IAiCommerceComment, converting all dates to string & tags.Format<'date-time'>
  return {
    id: updated.id,
    author_id: updated.author_id,
    parent_comment_id:
      updated.parent_comment_id === null ||
      updated.parent_comment_id === undefined
        ? undefined
        : updated.parent_comment_id,
    bulletin_id:
      updated.bulletin_id === null || updated.bulletin_id === undefined
        ? undefined
        : updated.bulletin_id,
    inquiry_id:
      updated.inquiry_id === null || updated.inquiry_id === undefined
        ? undefined
        : updated.inquiry_id,
    review_id:
      updated.review_id === null || updated.review_id === undefined
        ? undefined
        : updated.review_id,
    body: updated.body,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
