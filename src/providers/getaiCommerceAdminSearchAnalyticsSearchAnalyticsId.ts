import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSearchAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detail for a specific search analytics entry by ID
 *
 * Fetches a single, detailed analytics record referenced by dashboard or
 * analyst for reporting and optimization. Includes aggregated query
 * information, KPI breakdowns, filter/facet state, and analytic interval
 * windows.
 *
 * Only admin users can access or drill into individual analytics records; all
 * such actions are tracked in the compliance audit logs for evidence. Related
 * errors—such as record not found, access denied, or incomplete data—are
 * reported with actionable error messages. Access to drilldown data may vary by
 * system configuration/policy.
 *
 * @param props - Object containing admin payload and searchAnalyticsId
 * @param props.admin - Authenticated admin making the request
 * @param props.searchAnalyticsId - Unique ID for the analytics entry to view
 *   detail
 * @returns The detailed IAiCommerceSearchAnalytics record, fully populated
 * @throws {Error} If entry is not found for the given ID
 */
export async function getaiCommerceAdminSearchAnalyticsSearchAnalyticsId(props: {
  admin: AdminPayload;
  searchAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSearchAnalytics> {
  const { searchAnalyticsId } = props;
  const record = await MyGlobal.prisma.ai_commerce_search_analytics.findUnique({
    where: { id: searchAnalyticsId },
  });
  if (!record) {
    throw new Error("Search analytics entry not found for the given ID");
  }
  return {
    id: record.id,
    aggregation_key: record.aggregation_key,
    aggregation_value: record.aggregation_value,
    search_count: record.search_count,
    result_total: record.result_total,
    analyzed_period_start: toISOStringSafe(record.analyzed_period_start),
    analyzed_period_end: toISOStringSafe(record.analyzed_period_end),
  };
}
