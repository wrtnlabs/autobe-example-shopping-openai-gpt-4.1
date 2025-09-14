import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific comment for an inquiry (ai_commerce_comments).
 *
 * Allows an authenticated admin to edit the content or moderation status of a
 * comment belonging to a specific inquiry. The operation ensures the comment
 * with the provided commentId is attached to the inquiry specified by
 * inquiryId. Only fields present in the request body may be updated, and the
 * admin's privileges are required for status changes. Attempts to update a
 * non-existent comment, or a comment not tied to the specified inquiry, will
 * throw an error.
 *
 * Date/time fields are output in ISO 8601 format, never as native Date type.
 * Optional and nullable fields are mapped as required by the DTO.
 *
 * @param props - Object containing admin authentication, the inquiry id, the
 *   comment id, and the update payload.
 * @param props.admin - The authenticated admin making the request
 * @param props.inquiryId - The unique identifier for the inquiry to which the
 *   comment must belong
 * @param props.commentId - The unique identifier for the comment to update
 * @param props.body - Patch object containing one or more of body, status
 *   fields to change
 * @returns The updated comment as IAiCommerceComment
 * @throws {Error} If either the comment does not exist or does not belong to
 *   the specified inquiry
 */
export async function putaiCommerceAdminInquiriesInquiryIdCommentsCommentId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  const { inquiryId, commentId, body } = props;
  // Step 1: Verify comment exists for this inquiry
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      inquiry_id: inquiryId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or does not belong to this inquiry");
  }
  // Step 2: Update allowed fields (body, status, updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: {
      body: body.body ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });
  // Step 3: Map to IAiCommerceComment structure (no Date type, correct null/undefined)
  return {
    id: updated.id,
    author_id: updated.author_id,
    parent_comment_id:
      updated.parent_comment_id == null ? undefined : updated.parent_comment_id,
    bulletin_id: updated.bulletin_id == null ? undefined : updated.bulletin_id,
    inquiry_id: updated.inquiry_id == null ? undefined : updated.inquiry_id,
    review_id: updated.review_id == null ? undefined : updated.review_id,
    body: updated.body,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
