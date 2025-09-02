import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";
import { IPageIShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Search and retrieve a paginated list of articles, supporting filtering and
 * sorting.
 *
 * Retrieves a paginated, filterable list of articles with support for full-text
 * search, filtering by channel, author, status (draft, published, archived,
 * hidden), date range, title, and content. Suitable for use in browsing feeds,
 * management dashboards, or advanced search UI.
 *
 * This endpoint is public, allowing both authenticated and unauthenticated
 * users to search articles, but certain fields such as drafts or archived posts
 * may be restricted based on user role (filtered in business logic). The
 * operation employs efficient pagination and returns summarized article data,
 * enabling scalable UI rendering and rapid navigation through large article
 * sets.
 *
 * Request body parameters include pagination settings, filters, and sort
 * criteria. Responses provide the total count and detailed page of article
 * summaries with essential metadata for UI rendering.
 *
 * @param props - Request properties
 * @param props.body - Search, filter, pagination, and sort parameters for
 *   retrieving a list of articles
 * @returns Paginated list of article summaries that match the search/filter
 *   criteria
 * @throws {Error} When database or parameter combination is invalid
 */
export async function patch__shoppingMallAiBackend_articles(props: {
  body: IShoppingMallAiBackendArticle.IRequest;
}): Promise<IPageIShoppingMallAiBackendArticle.ISummary> {
  const { body } = props;
  // Default pagination
  const page = body.page != null ? Number(body.page) : 1;
  const limit = body.limit != null ? Number(body.limit) : 20;

  // Build where condition inline as required by brand/type rules
  const where = {
    deleted_at: null,
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && { channel_id: body.channel_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.is_notice !== undefined &&
      body.is_notice !== null && { is_notice: body.is_notice }),
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
    ...(body.title !== undefined &&
      body.title !== null && {
        title: { contains: body.title, mode: "insensitive" as const },
      }),
    ...(body.body !== undefined &&
      body.body !== null && {
        body: { contains: body.body, mode: "insensitive" as const },
      }),
  };

  // Only allow sorting by whitelisted fields
  const allowedSortFields = ["created_at", "view_count", "title"] as const;
  const sortField: "created_at" | "view_count" | "title" =
    allowedSortFields.includes(body.sort as any)
      ? (body.sort as "created_at" | "view_count" | "title")
      : "created_at";
  const sortOrder: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_articles.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        channel_id: true,
        title: true,
        author_id: true,
        status: true,
        view_count: true,
        is_notice: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_articles.count({ where }),
  ]);

  const data = items.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    channel_id: row.channel_id as string & tags.Format<"uuid">,
    title: row.title,
    author_id: row.author_id as string & tags.Format<"uuid">,
    status: row.status,
    view_count: row.view_count as number & tags.Type<"int32">,
    is_notice: row.is_notice,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
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
