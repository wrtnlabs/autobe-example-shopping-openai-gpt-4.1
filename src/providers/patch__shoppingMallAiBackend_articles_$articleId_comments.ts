import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import { IPageIShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Search and retrieve comments for a specific article, with pagination and
 * filtering.
 *
 * Retrieves a paginated, filterable list of comments belonging to a specific
 * article. Supports filtering by author, status, secret flag, date, or
 * full-text comment body search. Results are summarized for efficient display
 * in lists, feeds, or moderation dashboards. This endpoint is public for
 * viewing comments, but business logic may restrict access to private comments
 * or certain statuses depending on user role.
 *
 * Pagination and sort parameters optimize comment navigation for large
 * articles. Only comments not marked as deleted are returned, and visibility
 * follows business logic for author, reader, and moderator roles.
 *
 * @param props - Request properties
 * @param props.articleId - Unique identifier of the parent article for the
 *   comments
 * @param props.body - Search/filter/pagination/sort parameters for comments on
 *   the article
 * @returns A paginated list of comment summaries matching criteria for display
 *   or moderation
 * @throws {Error} When database or query fails
 */
export async function patch__shoppingMallAiBackend_articles_$articleId_comments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendArticleComment.IRequest;
}): Promise<IPageIShoppingMallAiBackendArticleComment.ISummary> {
  const { articleId, body } = props;

  // Pagination with safety fallback
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Where clause - skip deleted comments, apply all filters
  const where = {
    article_id: articleId,
    deleted_at: null,
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.is_secret !== undefined &&
      body.is_secret !== null && { is_secret: body.is_secret }),
    // Date range
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
    // Full-text (body)
    ...(body.q && { body: { contains: body.q, mode: "insensitive" as const } }),
  };

  // Only support sort by created_at desc per schema/business logic; ignore/override others safely
  const orderBy = { created_at: "desc" as const };

  // Query with type safety (no intermediate variables)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_article_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_article_comments.count({ where }),
  ]);

  // Map to summary DTO (convert dates + parent_id nullable)
  const data = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    body: row.body,
    is_secret: row.is_secret,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    parent_id: row.parent_id ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
