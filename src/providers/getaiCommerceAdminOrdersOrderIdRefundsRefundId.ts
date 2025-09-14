import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for a specific refund associated with an order from
 * ai_commerce_order_refunds.
 *
 * Retrieves the full record for a refund identified by both orderId and
 * refundId, strictly enforcing that the refund belongs to the target order.
 * Returns all financial and process details for use by customer support, admin,
 * and compliance.
 *
 * Security: Only admins (validated via the admin parameter) may invoke this
 * endpoint. Business rule is enforced by API parameter typing and does not
 * require explicit additional checks in this provider function.
 *
 * If the refund is not found (either nonexistent or not attached to the given
 * order), throws an error. All date fields are returned as ISO strings (string
 * & tags.Format<'date-time'>). Nullable or optional fields are mapped as
 * undefined/null as per IAiCommerceOrderRefund interface contract.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the lookup
 * @param props.orderId - UUID of the order containing the refund
 * @param props.refundId - UUID of the refund to retrieve
 * @returns The IAiCommerceOrderRefund for the given refund/orders
 * @throws {Error} If the refund does not exist for the specified order, or no
 *   record is found
 */
export async function getaiCommerceAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderRefund> {
  const { orderId, refundId } = props;
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findFirst({
    where: {
      id: refundId,
      order_id: orderId,
    },
  });
  if (!refund) {
    throw new Error("Refund not found for this order");
  }

  return {
    id: refund.id,
    order_id: refund.order_id,
    actor_id: refund.actor_id,
    refund_code: refund.refund_code,
    reason: refund.reason ?? undefined,
    status: refund.status,
    amount: refund.amount,
    currency: refund.currency,
    requested_at: toISOStringSafe(refund.requested_at),
    resolved_at:
      refund.resolved_at != null
        ? toISOStringSafe(refund.resolved_at)
        : undefined,
  };
}
