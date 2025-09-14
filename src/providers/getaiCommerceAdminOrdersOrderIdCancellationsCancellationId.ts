import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific order cancellation record
 * (ai_commerce_order_cancellations).
 *
 * Allows an authorized admin to fetch complete information for a particular
 * order cancellation. Verifies association between cancellation and order.
 * Returns all business fields including status, timestamps, actor/order IDs,
 * and workflow/context data. Used for audit, detail views, compliance, or
 * timeline UI in service flows.
 *
 * @param props - Request parameters and authentication
 * @param props.admin - Authenticated AdminPayload (authorization already
 *   checked)
 * @param props.orderId - UUID of the order to which the cancellation is tied
 * @param props.cancellationId - UUID of the cancellation record to fetch
 * @returns The cancellation record with all relevant fields for workflow/audit
 * @throws {Error} If not found or not associated to provided order
 */
export async function getaiCommerceAdminOrdersOrderIdCancellationsCancellationId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderCancellation> {
  const { admin, orderId, cancellationId } = props;
  const cancellation =
    await MyGlobal.prisma.ai_commerce_order_cancellations.findFirst({
      where: {
        id: cancellationId,
        order_id: orderId,
      },
    });
  if (!cancellation) {
    throw new Error("Cancellation not found or does not belong to order");
  }
  return {
    id: cancellation.id,
    order_id: cancellation.order_id,
    actor_id: cancellation.actor_id,
    cancellation_code: cancellation.cancellation_code,
    reason: cancellation.reason ?? undefined,
    status: cancellation.status,
    requested_at: toISOStringSafe(cancellation.requested_at),
    approved_at:
      cancellation.approved_at !== undefined &&
      cancellation.approved_at !== null
        ? toISOStringSafe(cancellation.approved_at)
        : (cancellation.approved_at ?? undefined),
    finalized_at:
      cancellation.finalized_at !== undefined &&
      cancellation.finalized_at !== null
        ? toISOStringSafe(cancellation.finalized_at)
        : (cancellation.finalized_at ?? undefined),
  };
}
