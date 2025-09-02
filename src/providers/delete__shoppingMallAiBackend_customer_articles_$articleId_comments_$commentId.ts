import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft delete a comment on an article by article ID and comment ID.
 *
 * This endpoint marks a specific comment on an article as deleted for
 * compliance and evidence requirements. Instead of hard deletion, it sets the
 * deleted_at field, preserving the record for audit and recovery workflows. The
 * operation may only be performed by the comment's author. If the article or
 * comment does not exist, or the user is not authorized, an error is thrown.
 * Idempotent: Deleting an already-deleted comment is a no-op (successful, but
 * no further change).
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer (payload)
 * @param props.articleId - UUID of the article containing the comment
 * @param props.commentId - UUID of the comment to be soft deleted
 * @returns Void
 * @throws {Error} When the comment does not exist or user is not the author
 */
export async function delete__shoppingMallAiBackend_customer_articles_$articleId_comments_$commentId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, articleId, commentId } = props;

  // Find the comment for the given article and comment ID
  const comment =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.findFirst({
      where: {
        id: commentId,
        article_id: articleId,
      },
    });
  if (!comment) {
    throw new Error("Comment not found");
  }
  // Only the author can delete
  if (comment.author_id !== customer.id) {
    throw new Error(
      "Forbidden: Only the comment author can delete the comment",
    );
  }

  // If the comment isn't already deleted, perform the soft delete
  if (comment.deleted_at == null) {
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.update({
      where: { id: commentId },
      data: {
        deleted_at: now,
        status: "deleted", // Optional: update status for audit
      },
    });
  }
  // If already deleted, do nothing (idempotent)
}
