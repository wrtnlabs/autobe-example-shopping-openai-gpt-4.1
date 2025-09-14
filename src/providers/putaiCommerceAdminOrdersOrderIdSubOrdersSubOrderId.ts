import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrders } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrders";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the details and status of a sub-order (ai_commerce_sub_orders) in a
 * given order.
 *
 * This endpoint allows an authenticated administrator to update the details of
 * a specific sub-order (fulfillment segment) within a parent order. Only admins
 * or the owning seller may mutate a sub-order, and all changes are logged to
 * the order audit log for compliance. Supported updates include status
 * transition, shipping/tracking assignment, and price modification. Attempts to
 * update a non-existent sub-order, one not belonging to the given order, or
 * attempts to make disallowed changes will be rejected with an error. All
 * date/datetime fields are handled as ISO8601 strings.
 *
 * @param props - The properties required to update a sub-order
 * @param props.admin - Payload of the authenticated admin user (must be valid
 *   and active)
 * @param props.orderId - Parent order's unique ID (ai_commerce_orders.id) to
 *   which the sub-order belongs
 * @param props.subOrderId - Unique sub-order ID to update
 *   (ai_commerce_sub_orders.id)
 * @param props.body - Update payload for the sub-order, specifying updatable
 *   properties (status, shipping_method, tracking_number, total_price)
 * @returns The updated sub-order as per the IAiCommerceSubOrders DTO
 * @throws {Error} If the sub-order does not exist or does not belong to the
 *   specified order
 */
export async function putaiCommerceAdminOrdersOrderIdSubOrdersSubOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrders.IUpdate;
}): Promise<IAiCommerceSubOrders> {
  const { admin, orderId, subOrderId, body } = props;

  // 1. Fetch the sub-order and check if it exists for the given order
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: {
      id: subOrderId,
      order_id: orderId,
      deleted_at: null,
    },
  });
  if (!subOrder) {
    throw new Error("Sub-order not found");
  }

  // 2. Prepare the update data (only allowed fields)
  // updated_at must always be set to current time as an ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.shipping_method !== undefined
      ? { shipping_method: body.shipping_method }
      : {}),
    ...(body.tracking_number !== undefined
      ? { tracking_number: body.tracking_number }
      : {}),
    ...(body.total_price !== undefined
      ? { total_price: body.total_price }
      : {}),
    updated_at: now,
  };

  // 3. Update the sub-order
  const updated = await MyGlobal.prisma.ai_commerce_sub_orders.update({
    where: { id: subOrderId },
    data: updateData,
  });

  // 4. Log this update in the audit trail
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      order_id: orderId,
      event_type: "suborder_update",
      actor_id: admin.id,
      occurred_at: now,
      event_note: undefined, // Optionally, details of change can be included
    },
  });

  // 5. Return the updated sub-order, branding date fields and optionals
  return {
    id: updated.id,
    order_id: updated.order_id,
    seller_id: updated.seller_id,
    suborder_code: updated.suborder_code,
    status: updated.status,
    shipping_method:
      updated.shipping_method === null ? undefined : updated.shipping_method,
    tracking_number:
      updated.tracking_number === null ? undefined : updated.tracking_number,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
