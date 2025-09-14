import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full analytics information for a single store by its unique
 * analytics record ID.
 *
 * Returns all key performance indicators, sales volume, visitor count, and any
 * additional metrics stored for the selected date period and store. Supports
 * admin-level review and compliance workflows.
 *
 * @param props - The request object for the analytics detail operation.
 * @param props.admin - The authenticated administrator making the request
 *   (authorization enforced upstream).
 * @param props.storeAnalyticsId - Unique identifier for the analytics summary
 *   (UUID).
 * @returns The analytics detail record for the requested store analytics ID,
 *   mapped to API DTO.
 * @throws {Error} If the store analytics record does not exist.
 */
export async function getaiCommerceAdminStoreAnalyticsStoreAnalyticsId(props: {
  admin: AdminPayload;
  storeAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceStoreAnalytics> {
  const { storeAnalyticsId } = props;
  const analytics = await MyGlobal.prisma.ai_commerce_store_analytics.findFirst(
    {
      where: {
        id: storeAnalyticsId,
      },
    },
  );
  if (!analytics) {
    throw new Error("Analytics record not found");
  }
  return {
    id: analytics.id,
    store_id: analytics.store_id,
    date_bucket: toISOStringSafe(analytics.date_bucket),
    sales_volume: analytics.sales_volume,
    orders_count: analytics.orders_count,
    visitors_count: analytics.visitors_count,
    conversion_rate: analytics.conversion_rate,
    analytics_json:
      analytics.analytics_json !== null &&
      analytics.analytics_json !== undefined
        ? analytics.analytics_json
        : analytics.analytics_json === null
          ? null
          : undefined,
    created_at: toISOStringSafe(analytics.created_at),
    updated_at: toISOStringSafe(analytics.updated_at),
  };
}
