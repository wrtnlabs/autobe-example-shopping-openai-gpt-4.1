import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Permanently deletes a seller sub-order from a parent order.
 *
 * This operation allows an authorized seller to permanently and irrevocably
 * remove a sub-order linked to their account from a parent order, provided the
 * sub-order is still in a deletable business state (status = "created").
 * Hard-deletion is enforced (no soft delete is present in the model). An audit
 * log entry will always be created to ensure compliance and legal
 * traceability.
 *
 * Business rules:
 *
 * - Only the assigned seller (seller_id == props.seller.id) may delete their
 *   sub-order (admin roles not handled by this implementation)
 * - Parent orderId must match subOrder's order_id
 * - Sub-order must be in a deletable state (status == "created"); deletion
 *   forbidden if fulfilled, shipped, or paid
 * - Deletion is immediate and permanent (hard delete)
 *
 * @param props - Parameters for delete operation
 * @param props.seller - Authenticated seller payload (must match sub-order)
 * @param props.orderId - Parent order ID (must match sub-order order_id)
 * @param props.subOrderId - Sub-order ID to delete
 * @returns Void
 * @throws Error if not authorized, sub-order not found, not in deletable state,
 *   or business rules violated
 */
export async function deleteaiCommerceSellerOrdersOrderIdSubOrdersSubOrderId(props: {
  seller: { id: string & tags.Format<"uuid">; type: "seller" };
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, orderId, subOrderId } = props;
  // Step 1: Fetch and validate sub-order existence and ownership
  const subOrder = await MyGlobal.prisma.ai_commerce_sub_orders.findUnique({
    where: { id: subOrderId },
  });
  if (!subOrder)
    throw new Error("Sub-order does not exist or is already deleted");
  if (subOrder.seller_id !== seller.id)
    throw new Error("Unauthorized: You are not the owner of this sub-order");
  if (subOrder.order_id !== orderId)
    throw new Error("Parent order does not match sub-order");
  // Step 2: Business state validation (only allow delete on "created" state)
  if (subOrder.status !== "created")
    throw new Error("Cannot delete sub-order after payment or fulfillment");
  // Step 3: Perform hard delete
  await MyGlobal.prisma.ai_commerce_sub_orders.delete({
    where: { id: subOrderId },
  });
  // Step 4: Log deletion in audit trail (no type assertions)
  await MyGlobal.prisma.ai_commerce_order_audit_logs.create({
    data: {
      id: v4(),
      order_id: orderId,
      event_type: "DELETE_SUB_ORDER",
      actor_id: seller.id,
      event_note: `Seller deleted sub-order: ${subOrderId} from order: ${orderId}`,
      occurred_at: toISOStringSafe(new Date()),
    },
  });
}
