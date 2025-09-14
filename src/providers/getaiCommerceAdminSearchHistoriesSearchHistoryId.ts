import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detail of a specific user search history event for analytics or
 * compliance review.
 *
 * Retrieves a single search history event, identified by its unique ID,
 * including all relevant metadata: query string, filters used, result count,
 * timestamps, and user/session context. Access is strictly limited to admin
 * users for compliance and analytic traceability; all accesses can be
 * audit-logged at the controller layer.
 *
 * @param props - Request object
 * @param props.admin - The authenticated admin making the request
 * @param props.searchHistoryId - Unique identifier for the search history event
 * @returns The full details of the specified search history event, or throws if
 *   not found
 * @throws {Error} If no search history record exists for the provided ID
 */
export async function getaiCommerceAdminSearchHistoriesSearchHistoryId(props: {
  admin: AdminPayload;
  searchHistoryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSearchHistory> {
  const record = await MyGlobal.prisma.ai_commerce_search_histories.findUnique({
    where: { id: props.searchHistoryId },
    select: {
      id: true,
      ai_commerce_buyer_id: true,
      query_string: true,
      filters_applied: true,
      result_count: true,
      search_timestamp: true,
      locale: true,
    },
  });
  if (!record) throw new Error("Search history not found");

  return {
    id: record.id,
    ai_commerce_buyer_id: record.ai_commerce_buyer_id ?? undefined,
    query_string: record.query_string,
    filters_applied: record.filters_applied ?? undefined,
    result_count: record.result_count,
    search_timestamp: toISOStringSafe(record.search_timestamp),
    locale: record.locale ?? undefined,
  };
}
