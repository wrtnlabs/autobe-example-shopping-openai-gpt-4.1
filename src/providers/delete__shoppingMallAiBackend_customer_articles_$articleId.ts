import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft delete an article (mark deleted_at for audit and compliance, not
 * removal).
 *
 * Allows an authenticated customer (author only) to mark an article as deleted,
 * setting deleted_at for compliance and audit. This operation prevents further
 * edits and display for soft-deleted articles. Only the author (customer.id)
 * may delete their own article. If already deleted, the operation is idempotent
 * and completes successfully without error. If the article is not found or the
 * customer is not the author, an error is thrown.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer performing the operation
 *   (must be the article author's id)
 * @param props.articleId - Unique identifier of the article to delete (UUID)
 * @returns Void
 * @throws {Error} When the article does not exist or the customer is not the
 *   author
 */
export async function delete__shoppingMallAiBackend_customer_articles_$articleId(props: {
  customer: CustomerPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, articleId } = props;
  const article =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.findUnique({
      where: { id: articleId },
    });
  if (!article) {
    throw new Error("Article not found");
  }
  if (article.deleted_at !== null) {
    // Idempotent: Already deleted, treat as success (no-op)
    return;
  }
  if (article.author_id !== customer.id) {
    throw new Error("Unauthorized: only the author can delete this article");
  }
  await MyGlobal.prisma.shopping_mall_ai_backend_articles.update({
    where: { id: articleId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
