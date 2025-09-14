import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update permitted details of a specific order (ai_commerce_orders table) by
 * UUID
 *
 * This endpoint allows the authenticated buyer (order owner) to update their
 * order's permitted fields (status, business_status, address_snapshot_id,
 * paid_amount) prior to terminal status. Edits after
 * delivery/closure/cancellation are strictly forbidden. The update operation
 * always refreshes the updated_at timestamp. Unauthorized or invalid status
 * transition attempts raise an actionable error. All date fields are provided
 * in ISO 8601 format, and UUIDs are strictly typed.
 *
 * @param props - Operation context and update request
 * @param props.buyer - Authenticated buyer performing the update
 * @param props.orderId - UUID of the target order
 * @param props.body - Update patch for the order
 * @returns The updated IAiCommerceOrder record with all fields normalized
 * @throws {Error} When the order is not found, buyer is not owner, or update is
 *   forbidden after terminal state
 */
export async function putaiCommerceBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrder.IUpdate;
}): Promise<IAiCommerceOrder> {
  // Fetch order ensuring existence and not soft-deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: props.orderId, deleted_at: null },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  // Ownership check: only order owner can mutate
  if (order.buyer_id !== props.buyer.id) {
    throw new Error("Forbidden: Only the order owner may update this order");
  }
  // Prevent updates if order is in a terminal state
  const terminalStatuses = ["delivered", "closed", "cancelled"];
  if (terminalStatuses.includes(order.status)) {
    throw new Error("Order cannot be modified after it is finalized");
  }
  // Build patch object: only allowed fields, skip undefineds
  const updates: IAiCommerceOrder.IUpdate & {
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(props.body.business_status !== undefined
      ? { business_status: props.body.business_status }
      : {}),
    ...(props.body.address_snapshot_id !== undefined
      ? { address_snapshot_id: props.body.address_snapshot_id }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.paid_amount !== undefined
      ? { paid_amount: props.body.paid_amount }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  // Apply update and fetch fresh record
  const updated = await MyGlobal.prisma.ai_commerce_orders.update({
    where: { id: props.orderId },
    data: updates,
  });
  // Map all return fields, properly convert date/times per spec
  return {
    id: updated.id,
    buyer_id: updated.buyer_id,
    channel_id: updated.channel_id,
    order_code: updated.order_code,
    status: updated.status,
    business_status: updated.business_status ?? undefined,
    total_price: updated.total_price,
    paid_amount: updated.paid_amount,
    currency: updated.currency,
    address_snapshot_id: updated.address_snapshot_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
