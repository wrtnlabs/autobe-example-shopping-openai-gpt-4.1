import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a single order status history event (ai_commerce_order_status_history) by
 * orderId and historyId.
 *
 * Retrieves a single ai_commerce_order_status_history event for an order,
 * identified by orderId and historyId. Returns the precise detail record for
 * that status change, including actor, timestamps, old/new status, business
 * workflow fields, and note. Access is limited to authenticated admins with
 * global privileges.
 *
 * @param props - The request parameters
 * @param props.admin - Authenticated admin payload (must be authorized)
 * @param props.orderId - The parent order's UUID (ai_commerce_orders.id)
 * @param props.historyId - The UUID of the status history event
 *   (ai_commerce_order_status_history.id)
 * @returns The full detail record from ai_commerce_order_status_history as per
 *   IAiCommerceOrderStatusHistory
 * @throws {Error} If the status history entry is not found for the specified
 *   order and id
 */
export async function getaiCommerceAdminOrdersOrderIdStatusHistoryHistoryId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderStatusHistory> {
  const { orderId, historyId } = props;
  const record =
    await MyGlobal.prisma.ai_commerce_order_status_history.findFirstOrThrow({
      where: { id: historyId, order_id: orderId },
      select: {
        id: true,
        order_id: true,
        actor_id: true,
        old_status: true,
        new_status: true,
        old_business_status: true,
        new_business_status: true,
        note: true,
        changed_at: true,
      },
    });
  return {
    id: record.id,
    order_id: record.order_id,
    actor_id: record.actor_id,
    old_status: record.old_status,
    new_status: record.new_status,
    old_business_status: record.old_business_status ?? undefined,
    new_business_status: record.new_business_status ?? undefined,
    note: record.note ?? undefined,
    changed_at: toISOStringSafe(record.changed_at),
  };
}
