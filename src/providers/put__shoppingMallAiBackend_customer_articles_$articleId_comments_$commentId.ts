import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Update a comment on an article by comment ID and article ID.
 *
 * This endpoint allows editing of an existing comment for a specific article,
 * identified by the articleId and commentId. Only the comment's author is
 * permitted to edit. Edits can include the body, is_secret flag, status, and
 * parent_id, as allowed by business policy.
 *
 * The comment is referenced from the shopping_mall_ai_backend_article_comments
 * table. Edits are only allowed if the comment is not soft-deleted (deleted_at:
 * null). All updates are audited via updated_at. If the comment does not exist
 * or is soft-deleted, or if the user is unauthorized, an error is thrown.
 *
 * @param props - The request parameters and body
 * @param props.customer - The authenticated customer (payload with id, type)
 * @param props.articleId - The UUID of the article to which the comment belongs
 * @param props.commentId - The UUID of the comment being updated
 * @param props.body - The update payload (fields to update: body, is_secret,
 *   status, parent_id)
 * @returns The updated comment record as IShoppingMallAiBackendArticleComment
 * @throws {Error} When comment is not found, is soft-deleted, or user is not
 *   authorized to edit
 */
export async function put__shoppingMallAiBackend_customer_articles_$articleId_comments_$commentId(props: {
  customer: { id: string & tags.Format<"uuid">; type: "customer" };
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendArticleComment.IUpdate;
}): Promise<IShoppingMallAiBackendArticleComment> {
  const { customer, articleId, commentId, body } = props;

  // Step 1: Retrieve the comment by ID, article, and ensure not soft-deleted
  const comment =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.findFirst({
      where: {
        id: commentId,
        article_id: articleId,
        deleted_at: null,
      },
    });
  if (!comment) throw new Error("Comment not found or has been deleted");

  // Step 2: Authorization — only the author may update their comment
  if (comment.author_id !== customer.id)
    throw new Error(
      "Forbidden: Only the comment author can update this comment",
    );

  // Step 3: Update with only supplied fields + update timestamp
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_comments.update({
      where: { id: commentId },
      data: {
        parent_id: body.parent_id ?? undefined,
        body: body.body ?? undefined,
        is_secret: body.is_secret ?? undefined,
        status: body.status ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 4: Return object conforming to IShoppingMallAiBackendArticleComment
  return {
    id: updated.id,
    article_id: updated.article_id,
    parent_id: updated.parent_id ?? null,
    author_id: updated.author_id,
    body: updated.body,
    is_secret: updated.is_secret,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
