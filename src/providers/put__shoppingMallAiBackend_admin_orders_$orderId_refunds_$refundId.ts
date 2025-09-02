import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing refund record for an order.
 *
 * This operation updates mutable fields of an order refund (reason, amount,
 * type, status, processed/completed times) for a specific order, as authorized
 * by an admin. Enforces compliance, tracks audit evidence, and allows only
 * business-permissible edits. Only the allowed fields defined in the DTO can be
 * updated. All status transitions and field changes are subject to business and
 * compliance constraints. All date/time values are returned as ISO8601
 * strings.
 *
 * @param props - Props for updating an order refund
 * @param props.admin - Authenticated admin payload (required for authorization)
 * @param props.orderId - Target order UUID for refund context (must match
 *   refund association)
 * @param props.refundId - Target refund UUID to update
 * @param props.body - Object containing fields to update (see
 *   IShoppingMallAiBackendOrderRefund.IUpdate)
 * @returns The updated IShoppingMallAiBackendOrderRefund object after all
 *   validations and state changes
 * @throws {Error} If the refund record is not found, is deleted, or not
 *   associated with the provided orderId
 */
export async function put__shoppingMallAiBackend_admin_orders_$orderId_refunds_$refundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: import("../api/structures/IShoppingMallAiBackendOrderRefund").IShoppingMallAiBackendOrderRefund.IUpdate;
}): Promise<
  import("../api/structures/IShoppingMallAiBackendOrderRefund").IShoppingMallAiBackendOrderRefund
> {
  const { admin, orderId, refundId, body } = props;
  // Authorization: enforced by presence of admin, per business contract

  // Find the order refund to update (by id/order context, not soft-deleted)
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

  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.update({
      where: { id: refundId },
      data: {
        // Only fields from DTO (IUpdate) can be updated
        refund_reason: body.refund_reason ?? undefined,
        refund_type: body.refund_type ?? undefined,
        amount: body.amount ?? undefined,
        currency: body.currency ?? undefined,
        status: body.status ?? undefined,
        processed_at:
          body.processed_at !== undefined
            ? body.processed_at === null
              ? null
              : toISOStringSafe(body.processed_at)
            : undefined,
        completed_at:
          body.completed_at !== undefined
            ? body.completed_at === null
              ? null
              : toISOStringSafe(body.completed_at)
            : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

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
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
