import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import { IPageIShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated article categories list.
 *
 * This endpoint returns a filtered, paginated list of article categories.
 * Filtering supports parent category, channel, and name substring search.
 * Results are paginated using standard page/limit keys and may be sorted by
 * available fields. Authorization as admin is required.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload (authorization required)
 * @param props.body - Search/pagination/filter keys for article categories (see
 *   IShoppingMallAiBackendArticleCategory.IRequest)
 * @returns A paginated set of article category summaries matching filters
 * @throws {Error} If database retrieval or pagination fails
 */
export async function patch__shoppingMallAiBackend_admin_articleCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendArticleCategory.IRequest;
}): Promise<IPageIShoppingMallAiBackendArticleCategory.ISummary> {
  const {
    page = 1,
    limit = 20,
    sort,
    parent_id,
    channel_id,
    q,
  } = props.body ?? {};

  // Authorization check: admin prop required (already enforced by controller)
  if (!props.admin || !props.admin.id || props.admin.type !== "admin") {
    throw new Error("Admin authorization required");
  }

  // Soft delete exclusion and main where clause
  const where = {
    deleted_at: null,
    ...(parent_id !== undefined && parent_id !== null && { parent_id }),
    ...(channel_id !== undefined && channel_id !== null && { channel_id }),
    ...(q !== undefined &&
      q !== null &&
      q.length > 0 && {
        name: { contains: q, mode: "insensitive" as const },
      }),
  };

  // Parse sort string, supports e.g. "order", "-order"
  let orderBy: { [key: string]: "asc" | "desc" } = { order: "asc" };
  if (typeof sort === "string" && sort.length > 0) {
    if (sort.startsWith("-")) {
      orderBy = { [sort.substring(1)]: "desc" };
    } else {
      orderBy = { [sort]: "asc" };
    }
  }
  // Pagination defaults/safety
  const skip = (page > 0 ? page - 1 : 0) * (limit > 0 ? limit : 20);
  const take = limit !== undefined && limit > 0 ? limit : 20;

  // Query database for paginated and filtered summary
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        channel_id: true,
        name: true,
        order: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_article_categories.count({
      where,
    }),
  ]);

  // Prepare ISummary array with correct date/time formatting (no Date types)
  const data = rows.map(
    (row): IShoppingMallAiBackendArticleCategory.ISummary => ({
      id: row.id,
      channel_id: row.channel_id,
      name: row.name,
      order: row.order,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    }),
  );

  // Compose canonical paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit && limit > 0 ? limit : 1)),
    },
    data,
  };
}
