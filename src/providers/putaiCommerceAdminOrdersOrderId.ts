import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing order (ai_commerce_orders) by orderId
 *
 * Allows an admin to update mutable fields on a specific order, including
 * business_status, address_snapshot_id, paid_amount, and status, strictly
 * within compliance and workflow rules. Performs order existence validation,
 * updates only permitted fields, and guarantees all dates are ISO strings. All
 * changes are legal/audit logged by upstream pipeline. Additional business
 * validation may be added as required, but this function only validates
 * existence and basic mutability per schema.
 *
 * @param props - Request parameter object
 * @param props.admin - The authenticated admin user performing the update
 *   (authorization is enforced externally)
 * @param props.orderId - The UUID primary key of the order to update
 * @param props.body - The patch object containing fields to update
 * @returns The updated IAiCommerceOrder object with all date-time values as
 *   branded strings
 * @throws {Error} If order does not exist, was deleted, or other database error
 */
export async function putaiCommerceAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IAiCommerceOrder.IUpdate;
}): Promise<IAiCommerceOrder> {
  const { orderId, body } = props;
  // Fetch order and confirm it exists, not deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new Error("Order not found or already deleted");
  }
  // Prepare timestamp for update
  const now = toISOStringSafe(new Date());
  // Perform the update, setting only allowed fields
  const updated = await MyGlobal.prisma.ai_commerce_orders.update({
    where: { id: orderId },
    data: {
      business_status: body.business_status ?? undefined,
      address_snapshot_id: body.address_snapshot_id ?? undefined,
      paid_amount: body.paid_amount ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });
  // Return the updated order, converting date-times properly
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
