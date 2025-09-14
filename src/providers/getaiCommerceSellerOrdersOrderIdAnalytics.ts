import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAnalytics";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get order analytics and performance statistics by orderId from
 * ai_commerce_order_analytics.
 *
 * This provider retrieves analytics and key performance metrics for a given
 * order. Only the seller associated with an order's items can access analytics
 * for that order. Throws an error if unauthorized or if analytics are not
 * found. All date fields are returned as ISO-formatted strings.
 *
 * @param props - Operation parameters.
 * @param props.seller - The authenticated seller making the request (must match
 *   order item seller).
 * @param props.orderId - The unique order ID to retrieve analytics for.
 * @returns Analytics summary and statistics as IAiCommerceOrderAnalytics
 *   structure.
 * @throws {Error} When the seller is not permitted to access this analytics
 *   record, or if the analytics record is missing.
 */
export async function getaiCommerceSellerOrdersOrderIdAnalytics(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAnalytics> {
  // Step 1: Authorization — ensure that at least one order item is owned by this seller.
  const authorizedItem =
    await MyGlobal.prisma.ai_commerce_order_items.findFirst({
      where: {
        order_id: props.orderId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  if (!authorizedItem) {
    throw new Error(
      "Unauthorized: You do not have permission to view analytics for this order.",
    );
  }

  // Step 2: Fetch analytics summary for the order.
  const analytics = await MyGlobal.prisma.ai_commerce_order_analytics.findFirst(
    {
      where: { order_id: props.orderId },
    },
  );
  if (!analytics) {
    throw new Error("Order analytics not found.");
  }

  // Step 3: Return response, ensuring all date fields are properly formatted.
  return {
    id: analytics.id,
    order_id: analytics.order_id,
    order_date: toISOStringSafe(analytics.order_date),
    order_value: analytics.order_value,
    items_count: analytics.items_count,
    refund_count: analytics.refund_count,
    after_sales_count: analytics.after_sales_count,
    completion_time_seconds: analytics.completion_time_seconds ?? undefined,
    last_status: analytics.last_status,
    updated_at: toISOStringSafe(analytics.updated_at),
  };
}
