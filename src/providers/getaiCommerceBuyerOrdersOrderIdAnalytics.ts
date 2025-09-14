import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAnalytics";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get order analytics and performance statistics by orderId from
 * ai_commerce_order_analytics.
 *
 * This function retrieves analytics and key performance metrics for a specific
 * order. Only the buyer who placed the order is authorized to retrieve
 * analytics through this endpoint. If the order does not exist or does not
 * belong to the authenticated buyer, or if the analytics row is absent, this
 * function throws a business error. All date/datetime fields are returned as
 * ISO 8601 formatted strings.
 *
 * @param props - Request object containing the authenticated buyer and the
 *   orderId to fetch analytics for.
 * @param props.buyer - The authenticated buyer, containing the user ID and role
 *   type.
 * @param props.orderId - The UUID of the order whose analytics are being
 *   requested.
 * @returns Analytics and performance statistics for the specific order.
 * @throws {Error} When the order does not exist, does not belong to the buyer,
 *   or analytics are not found.
 */
export async function getaiCommerceBuyerOrdersOrderIdAnalytics(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAnalytics> {
  const { buyer, orderId } = props;

  // Step 1: Validate order existence and ownership
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId, buyer_id: buyer.id },
  });
  if (!order) {
    throw new Error(
      "Order not found or you are not authorized to access this order's analytics.",
    );
  }

  // Step 2: Fetch analytics row
  const analytics =
    await MyGlobal.prisma.ai_commerce_order_analytics.findUnique({
      where: { order_id: orderId },
    });
  if (!analytics) {
    throw new Error("Analytics for this order do not exist.");
  }

  // Step 3: Map fields to DTO, converting all date/datetime values
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
