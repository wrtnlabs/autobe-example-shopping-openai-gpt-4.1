import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing refund record for an order (admin only).
 *
 * This operation updates fields such as status, reason, and resolved_at on a
 * refund record, identified by orderId and refundId. Only platform admins are
 * allowed to perform this operation. Throws if the refund does not belong to
 * the specified order or does not exist. All changes are persisted and returned
 * as a fully populated IAiCommerceOrderRefund DTO.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated AdminPayload performing the update
 * @param props.orderId - UUID of the order whose refund is being updated
 * @param props.refundId - UUID of the refund record to update
 * @param props.body - Update payload (status, reason, resolved_at)
 * @returns The updated IAiCommerceOrderRefund record
 * @throws {Error} When refund is not found or not associated with the given
 *   order
 */
export async function putaiCommerceAdminOrdersOrderIdRefundsRefundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderRefund.IUpdate;
}): Promise<IAiCommerceOrderRefund> {
  const { admin, orderId, refundId, body } = props;

  // 1. Fetch refund record and confirm association with specified order
  const refund = await MyGlobal.prisma.ai_commerce_order_refunds.findFirst({
    where: {
      id: refundId,
      order_id: orderId,
    },
  });
  if (!refund) {
    throw new Error("Refund not found or does not belong to given order");
  }

  // 2. Prepare update payload (only allow status, reason, resolved_at)
  const updated = await MyGlobal.prisma.ai_commerce_order_refunds.update({
    where: { id: refundId },
    data: {
      status: body.status ?? undefined,
      reason: body.reason ?? undefined,
      resolved_at:
        body.resolved_at !== undefined
          ? body.resolved_at === null
            ? null
            : toISOStringSafe(body.resolved_at)
          : undefined,
    },
  });

  // 3. Return full refund DTO with correct type conversions
  return {
    id: updated.id,
    order_id: updated.order_id,
    actor_id: updated.actor_id,
    refund_code: updated.refund_code,
    reason: updated.reason ?? undefined,
    status: updated.status,
    amount: updated.amount,
    currency: updated.currency,
    requested_at: toISOStringSafe(updated.requested_at),
    resolved_at:
      updated.resolved_at !== null && updated.resolved_at !== undefined
        ? toISOStringSafe(updated.resolved_at)
        : undefined,
  };
}
