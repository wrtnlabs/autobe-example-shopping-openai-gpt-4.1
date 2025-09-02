import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

/**
 * Retrieve detailed information for a specific article by ID.
 *
 * Fetches the full detail for a single article specified by its UUID. Returns
 * all business-relevant data including title, content body, meta fields, and
 * evidence fields. Ensures hidden, archived, or deleted articles are not
 * displayed to unauthorized users, following business logic. Only articles with
 * status 'published' and not soft-deleted are returned. Attempts to fetch
 * deleted or restricted articles will return an error.
 *
 * @param props - Request properties
 * @param props.articleId - Unique identifier of the article to retrieve
 * @returns The complete article record with title, content, meta, and audit
 *   fields, formatted for API output
 * @throws {Error} When the article does not exist, is deleted, or is not
 *   visible per business rules
 */
export async function get__shoppingMallAiBackend_articles_$articleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendArticle> {
  const article =
    await MyGlobal.prisma.shopping_mall_ai_backend_articles.findFirst({
      where: {
        id: props.articleId,
        deleted_at: null,
        status: "published",
      },
    });
  if (!article) {
    throw new Error("Article not found or not visible");
  }
  return {
    id: article.id,
    channel_id: article.channel_id,
    title: article.title,
    body: article.body,
    author_id: article.author_id,
    pinned: article.pinned,
    status: article.status,
    view_count: article.view_count,
    is_notice: article.is_notice,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
  };
}
