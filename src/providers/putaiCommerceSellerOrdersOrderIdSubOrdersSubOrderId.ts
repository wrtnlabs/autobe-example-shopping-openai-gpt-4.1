import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrders } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrders";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates the details and status of a sub-order (ai_commerce_sub_orders) in a
 * given order.
 *
 * This function allows an authenticated seller to update status, shipping
 * method, tracking number, and price allocation of a sub-order they own within
 * a specified parent order. Only the authorized seller (matched on seller_id)
 * may perform the update. All updates are strictly audit-logged for
 * compliance.
 *
 * @param props - Properties for the update operation
 * @param props.seller - The authenticated seller payload (only allowed to
 *   update their own sub-orders)
 * @param props.orderId - UUID of the parent order containing the sub-order
 * @param props.subOrderId - UUID of the sub-order to update
 * @param props.body - Allowed updates for sub-order status, shipping, and
 *   tracking
 * @returns The updated sub-order entity (IAiCommerceSubOrders)
 * @throws {Error} If sub-order does not exist or is not owned by the seller
 */
export async function putaiCommerceSellerOrdersOrderIdSubOrdersSubOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
  body: IAiCommerceSubOrders.IUpdate;
}): Promise<IAiCommerceSubOrders> {
  const { seller, orderId, subOrderId, body } = props;

  // Step 1: Verify sub-order existence and seller ownership
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
  if (subOrder.seller_id !== seller.id) {
    throw new Error("Forbidden: cannot update others sub-orders");
  }

  // Step 2: Update only allowed fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_sub_orders.update({
    where: { id: subOrderId },
    data: {
      status: body.status ?? undefined,
      shipping_method: body.shipping_method ?? undefined,
      tracking_number: body.tracking_number ?? undefined,
      total_price: body.total_price ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Audit log the update
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4(),
      order_id: orderId,
      event_type: "suborder_update",
      actor_id: seller.id,
      event_note: null,
      occurred_at: now,
    },
  });

  // Step 4: Map to API DTO and normalize nullable/optional fields
  return {
    id: updated.id,
    order_id: updated.order_id,
    seller_id: updated.seller_id,
    suborder_code: updated.suborder_code,
    status: updated.status,
    shipping_method:
      updated.shipping_method === undefined ? null : updated.shipping_method,
    tracking_number:
      updated.tracking_number === undefined ? null : updated.tracking_number,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
