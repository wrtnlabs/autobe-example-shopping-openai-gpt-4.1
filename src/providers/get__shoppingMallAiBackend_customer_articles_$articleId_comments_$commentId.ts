import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a specific comment for a given article by its unique identifiers.
 *
 * This function fetches a single comment associated with an article, ensuring
 * access to up-to-date comment data including its body, author, timestamps,
 * status, and privacy. Only the comment author can access secret/private
 * comments; all customers may see non-secret comments.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer payload requesting access
 * @param props.articleId - Unique identifier of the parent article
 * @param props.commentId - Unique identifier of the comment
 * @returns Detailed comment information for the specified article/comment ID
 *   pair
 * @throws {Error} If the comment is not found for the given IDs
 * @throws {Error} If access is forbidden due to privacy (secret) restrictions
 */
export async function get__shoppingMallAiBackend_customer_articles_$articleId_comments_$commentId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendArticleComment> {
  const { customer, articleId, commentId } = props;

  const comment =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.findFirst({
      where: { id: commentId, article_id: articleId, deleted_at: null },
    });
  if (!comment) throw new Error("Comment not found");
  // If comment is secret, only author can access
  if (comment.is_secret && comment.author_id !== customer.id) {
    throw new Error(
      "Forbidden: You do not have permission to access this comment",
    );
  }
  return {
    id: comment.id,
    article_id: comment.article_id,
    parent_id: comment.parent_id ?? null,
    author_id: comment.author_id,
    body: comment.body,
    is_secret: comment.is_secret,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
