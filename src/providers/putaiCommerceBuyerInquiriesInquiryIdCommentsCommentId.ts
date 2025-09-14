import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update a specific comment for an inquiry (ai_commerce_comments).
 *
 * Allows the author (buyer) to update their own comment on an inquiry. Users
 * can edit the comment's body, status, or visibility, provided the comment
 * exists, is not deleted, and belongs to both the correct inquiry and the
 * editing user. Enforces strict ownership (author_id = buyer.id), ensures
 * inquiry linkage, and rejects edits to others' comments. Handles soft deletion
 * and ensures only allowed fields are changed. All date fields are returned as
 * ISO 8601 strings.
 *
 * @param props - The request properties
 * @param props.buyer - The authenticated buyer performing the update
 * @param props.inquiryId - The UUID of the inquiry containing the target
 *   comment
 * @param props.commentId - The UUID of the comment to update
 * @param props.body - Object containing patch fields (body, status, visibility)
 * @returns The full updated IAiCommerceComment entity after the update
 * @throws {Error} When the comment does not exist, is already deleted, does not
 *   belong to the inquiry, or is not owned by the user
 */
export async function putaiCommerceBuyerInquiriesInquiryIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IUpdate;
}): Promise<IAiCommerceComment> {
  // Fetch the comment by id and not soft deleted
  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: { id: props.commentId, deleted_at: null },
  });
  if (!comment) throw new Error("Comment not found or deleted");

  // Enforce inquiry linkage
  if (comment.inquiry_id !== props.inquiryId) {
    throw new Error("Comment does not belong to the specified inquiry");
  }

  // Enforce strict author ownership
  if (comment.author_id !== props.buyer.id) {
    throw new Error("Forbidden: You can only edit your own comment");
  }

  // Prepare update data (immutable)
  const now = toISOStringSafe(new Date());
  const update: Record<string, unknown> = {
    ...(props.body.body !== undefined ? { body: props.body.body } : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.visibility !== undefined
      ? { visibility: props.body.visibility }
      : {}),
    updated_at: now,
  };

  // Update comment (only modifiable fields and updated_at)
  const updated = await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: props.commentId },
    data: update,
  });

  // Map to IAiCommerceComment DTO (brand conversion, correct undefined/null policy)
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
