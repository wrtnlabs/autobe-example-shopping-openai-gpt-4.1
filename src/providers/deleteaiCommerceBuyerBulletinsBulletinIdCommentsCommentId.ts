import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Deletes (soft delete) a specific comment on a bulletin for aiCommerce.
 *
 * This operation allows a comment author (buyer) to logically remove their own
 * comment from a bulletin. Instead of deleting the record from the database, it
 * sets the deleted_at field, enabling audit and recovery.
 *
 * Authorization: Only the buyer who authored the comment may perform this
 * action. If the comment does not exist, is already deleted, not attached to
 * the specified bulletin, or is not owned by the authenticated buyer, an error
 * is thrown. All deletion attempts should be recorded for audit compliance (not
 * implemented here).
 *
 * @param props - Properties object containing:
 *
 *   - Buyer: The authenticated buyer payload
 *   - BulletinId: UUID of the bulletin containing the comment
 *   - CommentId: UUID of the comment to delete
 *
 * @returns Void
 * @throws {Error} When the comment does not exist, is not attached to the
 *   specified bulletin, is already deleted, or the buyer is not the author
 */
export async function deleteaiCommerceBuyerBulletinsBulletinIdCommentsCommentId(props: {
  buyer: BuyerPayload;
  bulletinId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, bulletinId, commentId } = props;

  const comment = await MyGlobal.prisma.ai_commerce_comments.findFirst({
    where: {
      id: commentId,
      bulletin_id: bulletinId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error(
      "Comment does not exist, is not attached to this bulletin, or has already been deleted.",
    );
  }
  if (comment.author_id !== buyer.id) {
    throw new Error(
      "Permission denied: Only the comment author can delete this comment.",
    );
  }

  await MyGlobal.prisma.ai_commerce_comments.update({
    where: { id: commentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // TODO: Insert audit log in ai_commerce_ugc_audit_logs for compliance (implementation omitted; requires additional DTOs not in scope)
}
