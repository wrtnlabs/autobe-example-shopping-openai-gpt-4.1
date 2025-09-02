import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Updates an existing order refund record (reason, amount, status, etc.) linked
 * to a specific order.
 *
 * Enables authorized customers to update their own refund requests with
 * additional details or processing status changes. Enforces strict
 * authorization (must own order), prevents changes to locked/completed refunds,
 * and tracks all changes for audit/compliance. Only mutable fields (reason,
 * type, amount, currency, status, processed_at, completed_at) can be
 * changed—others are immutable.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer performing the update (must
 *   own order)
 * @param props.orderId - Order ID to which the refund belongs
 * @param props.refundId - Target refund ID to update
 * @param props.body - Fields to update
 *   (IShoppingMallAiBackendOrderRefund.IUpdate)
 * @returns The updated IShoppingMallAiBackendOrderRefund record
 * @throws {Error} When refund/order is not found, user not authorized, or
 *   update is disallowed by state
 */
export async function put__shoppingMallAiBackend_customer_orders_$orderId_refunds_$refundId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderRefund.IUpdate;
}): Promise<IShoppingMallAiBackendOrderRefund> {
  const { customer, orderId, refundId, body } = props;

  // 1. Fetch refund and ensure not soft deleted
  const refund =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findFirst({
      where: {
        id: refundId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!refund) throw new Error("Refund not found");

  // 2. Fetch order and verify ownership
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: { id: orderId },
    },
  );
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error(
      "Unauthorized: Only the order owner can update this refund",
    );
  }

  // 3. Prevent update if refund is locked (status === 'completed')
  if (refund.status === "completed") {
    throw new Error("Cannot update a refund in completed state");
  }

  // 4. Build allowed updates, with correct null/undefined/date handling
  const updates: IShoppingMallAiBackendOrderRefund.IUpdate & {
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.refund_reason !== undefined
      ? { refund_reason: body.refund_reason }
      : {}),
    ...(body.refund_type !== undefined
      ? { refund_type: body.refund_type }
      : {}),
    ...(body.amount !== undefined ? { amount: body.amount } : {}),
    ...(body.currency !== undefined ? { currency: body.currency } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.processed_at !== undefined
      ? {
          processed_at:
            body.processed_at === null
              ? null
              : toISOStringSafe(body.processed_at),
        }
      : {}),
    ...(body.completed_at !== undefined
      ? {
          completed_at:
            body.completed_at === null
              ? null
              : toISOStringSafe(body.completed_at),
        }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.update({
      where: { id: refundId },
      data: updates,
    });

  // 5. Return as API dto, converting Date fields with toISOStringSafe and handling nullable
  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    refund_reason: updated.refund_reason,
    refund_type: updated.refund_type,
    amount: updated.amount,
    currency: updated.currency,
    status: updated.status,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at:
      updated.processed_at === null
        ? null
        : toISOStringSafe(updated.processed_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
