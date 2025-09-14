import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTrendingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTrendingProduct";
import { IPageIAiCommerceTrendingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceTrendingProduct";

/**
 * Retrieve a paginated and filtered list of trending products
 * (ai_commerce_trending_products).
 *
 * This endpoint provides a paginated, filterable listing of products flagged as
 * trending within the ai_commerce_trending_products table. It supports
 * filtering by analytics score, manual override status, and creation date
 * range, and provides robust sorting and pagination to serve discovery,
 * analytics, and homepage feed scenarios. Sensitive or keyword-based searching
 * is not directly supported by this summary endpoint (see product search).
 *
 * Error handling is through normal error responses (query errors, unrecognized
 * parameters, or internal analytics errors). All returned records strictly
 * conform to summary DTO structure.
 *
 * @param props - Request containing filter, sort, and pagination options in
 *   body.
 * @returns Paginated summary of trending product records with pagination
 *   metadata.
 * @throws {Error} Throws on query error or database access error
 */
export async function patchaiCommerceTrendingProducts(props: {
  body: IAiCommerceTrendingProduct.IRequest;
}): Promise<IPageIAiCommerceTrendingProduct.ISummary> {
  const { body } = props;

  // Filtering logic (only by fields existing on the Prisma model)
  const where = {
    ...(body.min_score !== undefined && {
      analytics_score: { gte: body.min_score },
    }),
    ...(body.max_score !== undefined && {
      analytics_score: {
        ...(body.min_score !== undefined ? { gte: body.min_score } : {}),
        lte: body.max_score,
      },
    }),
    ...(body.is_manual_override !== undefined && {
      is_manual_override: body.is_manual_override,
    }),
    ...(body.created_from !== undefined && {
      created_at: { gte: body.created_from },
    }),
    ...(body.created_to !== undefined && {
      created_at: {
        ...(body.created_from !== undefined ? { gte: body.created_from } : {}),
        lte: body.created_to,
      },
    }),
  };

  // Sorting logic: only allow analytics_score or created_at, default to created_at desc
  let orderByField: "analytics_score" | "created_at" = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (body.sort) {
    const sortField = body.sort.replace(/^[-+]/, "");
    if (sortField === "analytics_score" || sortField === "created_at") {
      orderByField = sortField;
      orderByDirection = body.sort.startsWith("-") ? "desc" : "asc";
    }
  }

  // Pagination logic, with defensive normalization (never Date, only numbers/string/date-time)
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Parallel DB fetch for page & total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_trending_products.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_trending_products.count({ where }),
  ]);

  // Map database rows to ISummary DTO
  const data: IAiCommerceTrendingProduct.ISummary[] = rows.map((row) => ({
    id: row.id,
    ai_commerce_product_id: row.ai_commerce_product_id,
    analytics_score: row.analytics_score,
    is_manual_override: row.is_manual_override,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination struct per IPage.IPagination
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
