import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get order analytics and performance statistics by orderId from
 * ai_commerce_order_analytics.
 *
 * Retrieves analytics and performance metrics for the specified order. Only
 * accessible to authenticated platform admins. Date fields are safely
 * converted, types are strictly enforced, and forbidden patterns are avoided.
 *
 * @param props - Properties for the analytics retrieval operation
 * @param props.admin - Admin payload (authorization is checked by decorator)
 * @param props.orderId - Unique identifier (UUID) of the order
 * @returns Analytics and performance statistics for the order meeting
 *   IAiCommerceOrderAnalytics contract
 * @throws {Error} When the analytics for the specified order are not found
 */
export async function getaiCommerceAdminOrdersOrderIdAnalytics(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAnalytics> {
  const { orderId } = props;
  const analytics = await MyGlobal.prisma.ai_commerce_order_analytics.findFirst(
    {
      where: { order_id: orderId },
    },
  );
  if (!analytics) {
    throw new Error("Analytics for this order not found");
  }
  return {
    id: analytics.id,
    order_id: analytics.order_id,
    order_date: toISOStringSafe(analytics.order_date),
    order_value: analytics.order_value,
    items_count: analytics.items_count,
    refund_count: analytics.refund_count,
    after_sales_count: analytics.after_sales_count,
    completion_time_seconds:
      analytics.completion_time_seconds !== null &&
      analytics.completion_time_seconds !== undefined
        ? analytics.completion_time_seconds
        : undefined,
    last_status: analytics.last_status,
    updated_at: toISOStringSafe(analytics.updated_at),
  };
}
