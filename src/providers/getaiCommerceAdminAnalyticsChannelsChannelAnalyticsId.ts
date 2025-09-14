import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAnalyticsChannels } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAnalyticsChannels";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get analytics KPI summary for a specific channel
 * (ai_commerce_analytics_channels).
 *
 * Fetches the analytics summary for a specific channel by channelAnalyticsId
 * (primary key) in ai_commerce_analytics_channels. Serves admin performance
 * dashboard, compliance, or reporting use cases.
 *
 * Only authenticated admins may view this data. Returns full KPI and analytics
 * snapshot details. Throws an error if the target does not exist.
 *
 * @param props - Properties containing the authenticated admin and the target
 *   channelAnalyticsId
 * @param props.admin - Authenticated admin user making the request
 * @param props.channelAnalyticsId - Primary key identifier for the
 *   ai_commerce_analytics_channels record to retrieve
 * @returns Complete analytics channel KPI summary for the specified channel
 * @throws {Error} If the channel analytics record does not exist for the given
 *   id
 */
export async function getaiCommerceAdminAnalyticsChannelsChannelAnalyticsId(props: {
  admin: AdminPayload;
  channelAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceAnalyticsChannels> {
  const { channelAnalyticsId } = props;
  // Auth is contractually enforced by decorator/payload design (props.admin); no further logic here
  const analytics =
    await MyGlobal.prisma.ai_commerce_analytics_channels.findUnique({
      where: { id: channelAnalyticsId },
      select: {
        id: true,
        ai_commerce_channel_id: true,
        stat_date: true,
        total_orders: true,
        total_sales: true,
        total_buyers: true,
        created_at: true,
      },
    });
  if (!analytics) throw new Error("Analytics summary not found");
  return {
    id: analytics.id,
    ai_commerce_channel_id: analytics.ai_commerce_channel_id,
    stat_date: toISOStringSafe(analytics.stat_date),
    total_orders: analytics.total_orders,
    total_sales: analytics.total_sales,
    total_buyers: analytics.total_buyers,
    created_at: toISOStringSafe(analytics.created_at),
  };
}
