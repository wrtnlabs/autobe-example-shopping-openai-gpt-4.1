import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSearchAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchAnalytics";
import { IPageIAiCommerceSearchAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSearchAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, aggregate, and paginate discovery search analytics for backend
 * monitoring and optimization
 *
 * This operation retrieves a paginated and filtered set of platform search
 * analytics from the ai_commerce_search_analytics table. Analytics may be
 * aggregated by query string, date, filter/facet, or segmentation key. The
 * endpoint supports advanced analytics dashboards and backend optimization of
 * search and discovery business logic.
 *
 * Enables authorized users to fetch search-related KPIs, statistics, and
 * analytics events for the discovery system, filtered by query, aggregation
 * type, timeframe, or custom dashboard segmentation. The endpoint is essential
 * for BI teams, admin analysis, and platform recommendation optimization.
 *
 * Access is restricted to admin roles with permission to analytics dashboards
 * or BI modules. Results are paginated and can be aggregated for trend,
 * segment, or dashboard reporting. Security controls prevent excessive loads or
 * data exfiltration, and all accesses are monitored for compliance.
 *
 * Responses return summarized, aggregate analytics datasets designed for
 * integration into data dashboards and optimization routines.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator performing the request
 * @param props.body - Request body containing analytics filtering, aggregation,
 *   and pagination options
 * @returns Paginated analytics summary matching the dashboard or analyst query
 * @throws {Error} When unauthorized access is attempted or parameters are
 *   invalid
 */
export async function patchaiCommerceAdminSearchAnalytics(props: {
  admin: AdminPayload;
  body: IAiCommerceSearchAnalytics.IRequest;
}): Promise<IPageIAiCommerceSearchAnalytics> {
  const { body } = props;
  const {
    aggregation_key,
    aggregation_value,
    from,
    to,
    page,
    limit,
    sort,
    order,
  } = body;

  const allowedSortFields = [
    "aggregation_key",
    "aggregation_value",
    "search_count",
    "result_total",
    "analyzed_period_start",
    "analyzed_period_end",
  ];
  const sortBy = allowedSortFields.includes(sort ?? "")
    ? (sort ?? "aggregation_key")
    : "aggregation_key";
  const sortOrder = order === "desc" ? "desc" : "asc";
  const pageNumber =
    typeof page === "number" && !isNaN(page) && page >= 1 ? page : 1;
  const limitNumber =
    typeof limit === "number" && !isNaN(limit) && limit >= 1 && limit <= 100
      ? limit
      : 20;
  const skip = (pageNumber - 1) * limitNumber;

  const where = {
    ...(aggregation_key !== undefined &&
      aggregation_key !== null && {
        aggregation_key: aggregation_key,
      }),
    ...(aggregation_value !== undefined &&
      aggregation_value !== null && {
        aggregation_value: aggregation_value,
      }),
    ...((from !== undefined && from !== null) ||
    (to !== undefined && to !== null)
      ? {
          analyzed_period_start: {
            ...(from !== undefined && from !== null && { gte: from }),
            ...(to !== undefined && to !== null && { lte: to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_search_analytics.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNumber,
    }),
    MyGlobal.prisma.ai_commerce_search_analytics.count({ where }),
  ]);

  const pageCount = limitNumber > 0 ? Math.ceil(total / limitNumber) : 0;

  const data = rows.map((row) => ({
    id: row.id,
    aggregation_key: row.aggregation_key,
    aggregation_value: row.aggregation_value,
    search_count: row.search_count,
    result_total: row.result_total,
    analyzed_period_start: toISOStringSafe(row.analyzed_period_start),
    analyzed_period_end: toISOStringSafe(row.analyzed_period_end),
  }));

  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(limitNumber),
      records: total,
      pages: pageCount,
    },
    data,
  };
}
