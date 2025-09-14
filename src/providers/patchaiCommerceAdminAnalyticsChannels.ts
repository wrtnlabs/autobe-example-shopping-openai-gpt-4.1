import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAnalyticsChannels } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAnalyticsChannels";
import { IPageIAiCommerceAnalyticsChannels } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceAnalyticsChannels";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list analytics channel summaries (ai_commerce_analytics_channels).
 *
 * Allows admin users to search and retrieve paginated KPI summaries for
 * business intelligence and platform performance analysis. Results can be
 * filtered by analytics date, channel, KPIs, and support advanced pagination
 * and sorting. All searches are subject to audit and error checks. Only admin
 * role can access.
 *
 * @param props - Request context
 * @param props.admin - The authenticated admin user performing the search
 *   (role-based access enforced)
 * @param props.body - Filter, sorting, and pagination options for the analytics
 *   channel list
 * @returns Paginated result set of analytics channel records matching the given
 *   filter and paging options
 * @throws {Error} Malformed request parameters (e.g., page/limit ≤ 0)
 */
export async function patchaiCommerceAdminAnalyticsChannels(props: {
  admin: AdminPayload;
  body: IAiCommerceAnalyticsChannels.IRequest;
}): Promise<IPageIAiCommerceAnalyticsChannels> {
  const { body } = props;
  // Validate and normalize pagination
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page <= 0 ||
    limit <= 0
  ) {
    throw new Error("Parameters 'page' and 'limit' must be positive integers");
  }

  // Construct where clause for Prisma filtering
  const where: Record<string, unknown> = {};
  if (body.ai_commerce_channel_id !== undefined) {
    where.ai_commerce_channel_id = body.ai_commerce_channel_id;
  }
  if (body.stat_date_from !== undefined) {
    where.stat_date = {
      ...((where.stat_date as Record<string, string>) ?? {}),
      gte: body.stat_date_from,
    };
  }
  if (body.stat_date_to !== undefined) {
    where.stat_date = {
      ...((where.stat_date as Record<string, string>) ?? {}),
      lte: body.stat_date_to,
    };
  }
  if (body.min_total_orders !== undefined) {
    where.total_orders = {
      ...((where.total_orders as Record<string, number>) ?? {}),
      gte: body.min_total_orders,
    };
  }
  if (body.max_total_orders !== undefined) {
    where.total_orders = {
      ...((where.total_orders as Record<string, number>) ?? {}),
      lte: body.max_total_orders,
    };
  }
  if (body.min_total_sales !== undefined) {
    where.total_sales = {
      ...((where.total_sales as Record<string, number>) ?? {}),
      gte: body.min_total_sales,
    };
  }
  if (body.max_total_sales !== undefined) {
    where.total_sales = {
      ...((where.total_sales as Record<string, number>) ?? {}),
      lte: body.max_total_sales,
    };
  }
  if (body.min_total_buyers !== undefined) {
    where.total_buyers = {
      ...((where.total_buyers as Record<string, number>) ?? {}),
      gte: body.min_total_buyers,
    };
  }
  if (body.max_total_buyers !== undefined) {
    where.total_buyers = {
      ...((where.total_buyers as Record<string, number>) ?? {}),
      lte: body.max_total_buyers,
    };
  }

  // Sorting options
  const allowedSortFields = [
    "stat_date",
    "total_orders",
    "total_sales",
    "total_buyers",
  ];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "stat_date";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Query data and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_analytics_channels.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        ai_commerce_channel_id: true,
        stat_date: true,
        total_orders: true,
        total_sales: true,
        total_buyers: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_analytics_channels.count({ where }),
  ]);

  // Type-safe mapping of results, converting Date fields using toISOStringSafe
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ai_commerce_channel_id: row.ai_commerce_channel_id,
      stat_date: toISOStringSafe(row.stat_date),
      total_orders: row.total_orders,
      total_sales: row.total_sales,
      total_buyers: row.total_buyers,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
