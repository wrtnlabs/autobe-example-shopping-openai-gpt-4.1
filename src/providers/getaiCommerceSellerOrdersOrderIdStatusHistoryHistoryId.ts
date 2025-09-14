import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get a single order status history event (ai_commerce_order_status_history) by
 * orderId and historyId.
 *
 * Retrieves a single ai_commerce_order_status_history event for a given order
 * by orderId and historyId. It provides complete detail for one status change
 * event, including actor, timestamps, old/new status, and note. Only accessible
 * to the order's buyer, associated seller(s), or admins. Serves for deep audit
 * of specific state changes within an order’s lifecycle.
 *
 * Permission to retrieve this data is granted to the buyer (who placed the
 * order), sellers associated with any related sub-orders, or administrators.
 * This operation supports support workflows and regulatory audit requirements,
 * enabling investigation of specific lifecycle transitions in the order's
 * record.
 *
 * @param props - Properties for operation
 * @param props.seller - The authenticated seller (must be associated to the
 *   order via sub-orders)
 * @param props.orderId - The order whose status history event is being accessed
 * @param props.historyId - Unique ID of the status history event being
 *   retrieved
 * @returns A full IAiCommerceOrderStatusHistory DTO with all fields mapped
 * @throws {Error} If the status history event does not exist or seller is not
 *   authorized for this order
 */
export async function getaiCommerceSellerOrdersOrderIdStatusHistoryHistoryId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderStatusHistory> {
  const { seller, orderId, historyId } = props;

  // Step 1: Find the requested order status history event for this order
  const statusHistory =
    await MyGlobal.prisma.ai_commerce_order_status_history.findFirst({
      where: {
        id: historyId,
        order_id: orderId,
      },
    });
  if (!statusHistory) {
    throw new Error("Order status history not found");
  }

  // Step 2: Find seller profile (ensure seller is active and not deleted)
  const sellerProfile = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
    },
  });
  if (!sellerProfile) {
    throw new Error("Seller not found or not active");
  }

  // Step 3: Check sub-order association (seller must be assigned to this order)
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: {
      order_id: orderId,
      seller_id: sellerProfile.id,
      deleted_at: null,
    },
  });
  if (!subOrder) {
    throw new Error("Unauthorized: You are not a seller for this order");
  }

  // Step 4: Return DTO with correct date/time type for changed_at. Map nullable → undefined for optionals.
  return {
    id: statusHistory.id,
    order_id: statusHistory.order_id,
    actor_id: statusHistory.actor_id,
    old_status: statusHistory.old_status,
    new_status: statusHistory.new_status,
    old_business_status:
      statusHistory.old_business_status === null
        ? undefined
        : statusHistory.old_business_status,
    new_business_status:
      statusHistory.new_business_status === null
        ? undefined
        : statusHistory.new_business_status,
    note: statusHistory.note === null ? undefined : statusHistory.note,
    changed_at: toISOStringSafe(statusHistory.changed_at),
  };
}
