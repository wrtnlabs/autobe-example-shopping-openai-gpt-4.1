import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves the details of a specific refund record associated with an order
 * for a user or admin review.
 *
 * Shows reason, amount, status, type, timeline, and audit fields. Critical for
 * compliance with refund policy, customer service, and facilitation of dispute
 * processes. Only the owner or authorized users may query the data. Relies on
 * the Orders and OrderRefunds Prisma models; enforces soft-delete and ownership
 * logic.
 *
 * @param props - Parameters for the request
 * @param props.customer - The authenticated customer (must own the order)
 * @param props.orderId - ID of the parent order
 * @param props.refundId - ID of the specific refund to retrieve
 * @returns The refund record with all business, audit, and status fields
 *   formatted
 * @throws {Error} If the refund or order does not exist, has been deleted, or
 *   the user is not the owner
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_refunds_$refundId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderRefund> {
  const { customer, orderId, refundId } = props;

  // Step 1: Fetch refund by refundId + orderId; must not be soft-deleted
  const refund =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findFirst({
      where: {
        id: refundId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!refund) {
    throw new Error("Refund not found");
  }

  // Step 2: Fetch the parent order and check ownership
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        deleted_at: null,
      },
    },
  );
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: You do not own this order refund record");
  }

  // Step 3: Map refund to API DTO, converting all Date fields
  return {
    id: refund.id,
    shopping_mall_ai_backend_order_id: refund.shopping_mall_ai_backend_order_id,
    refund_reason: refund.refund_reason,
    refund_type: refund.refund_type,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    requested_at: toISOStringSafe(refund.requested_at),
    processed_at: refund.processed_at
      ? toISOStringSafe(refund.processed_at)
      : null,
    completed_at: refund.completed_at
      ? toISOStringSafe(refund.completed_at)
      : null,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at: refund.deleted_at ? toISOStringSafe(refund.deleted_at) : null,
  };
}
