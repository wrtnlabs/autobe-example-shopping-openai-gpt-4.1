import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreAnalytics";
import { IPageIAiCommerceStoreAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceStoreAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated store analytics (ai_commerce_store_analytics).
 *
 * Retrieve a filtered, paginated set of analytics records for stores,
 * supporting queries by store ID, time period (date_bucket), and core metrics
 * like sales volume, orders count, and conversion rates. Enables comprehensive
 * reporting and insight into store performance for administrative dashboards.
 * Only accessible to admins.
 *
 * @param props - Object containing the admin's authentication payload and
 *   query/filtering body
 * @param props.admin - Authenticated admin context (authorization already
 *   enforced)
 * @param props.body - Analytics filters and pagination controls (store, period,
 *   metric, sort, pagination)
 * @returns Paginated analytics summary matching the filters provided
 * @throws {Error} If page/limit is invalid or internal database error occurs
 */
export async function patchaiCommerceAdminStoreAnalytics(props: {
  admin: AdminPayload;
  body: IAiCommerceStoreAnalytics.IRequest;
}): Promise<IPageIAiCommerceStoreAnalytics.ISummary> {
  const { body } = props;

  // Pagination variables, enforcing defaults and mods per tags
  const page =
    typeof body.page === "number" && body.page > 0 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? Number(body.limit) : 20;

  // Construct date_bucket filter (gte/lte) if present
  const dateBucket: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.date_from !== undefined && body.date_from !== null)
    dateBucket.gte = body.date_from;
  if (body.date_to !== undefined && body.date_to !== null)
    dateBucket.lte = body.date_to;

  // Conversion rate filter (gte/lte) if present
  const conversionRate: { gte?: number; lte?: number } = {};
  if (
    body.min_conversion_rate !== undefined &&
    body.min_conversion_rate !== null
  )
    conversionRate.gte = body.min_conversion_rate;
  if (
    body.max_conversion_rate !== undefined &&
    body.max_conversion_rate !== null
  )
    conversionRate.lte = body.max_conversion_rate;

  // Filter build: always deleted_at == null for soft delete semantics
  const where = {
    deleted_at: null,
    ...(body.store_id !== undefined &&
      body.store_id !== null && { store_id: body.store_id }),
    ...(Object.keys(dateBucket).length > 0 && { date_bucket: dateBucket }),
    ...(Object.keys(conversionRate).length > 0 && {
      conversion_rate: conversionRate,
    }),
  };

  // Sorting: parse field:direction if valid, else default to date_bucket desc
  let orderBy: Record<string, "asc" | "desc"> = { date_bucket: "desc" };
  if (body.sort) {
    const [rawField, rawDir] = body.sort.split(":");
    const allowedFields = [
      "date_bucket",
      "sales_volume",
      "orders_count",
      "visitors_count",
      "conversion_rate",
    ];
    const dir = rawDir === "asc" ? "asc" : "desc";
    if (allowedFields.includes(rawField)) {
      orderBy = { [rawField]: dir };
    }
  }

  // DB query for paginated summary set and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_store_analytics.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_store_analytics.count({ where }),
  ]);

  // Map DB rows to DTO, ensuring branding and no Date
  const data = rows.map((r) => ({
    id: r.id,
    store_id: r.store_id,
    date_bucket: toISOStringSafe(r.date_bucket),
    sales_volume: r.sales_volume,
    orders_count: r.orders_count,
    visitors_count: r.visitors_count,
    conversion_rate: r.conversion_rate,
  }));

  // Compute pagination info with enforced type
  const pages = Math.ceil(total / limit);
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(pages),
  };

  return {
    pagination,
    data,
  };
}
