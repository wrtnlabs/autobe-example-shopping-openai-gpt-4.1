import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the details of a specific refund record associated with an order
 * for a user or admin review. Shows reason, amount, status, type, timeline, and
 * all audit fields. Only the owner or authorized admin users may query the
 * data. Critical for compliance with refund policy, customer service, and
 * facilitation of dispute processes.
 *
 * @param props - Request properties
 * @param props.admin - System admin identity, validated and active (required
 *   for access)
 * @param props.orderId - The parent order's unique ID (UUID, composite key)
 * @param props.refundId - The refund record's unique ID (UUID, composite key)
 * @returns IShoppingMallAiBackendOrderRefund object containing full refund
 *   information, including all compliance and audit fields
 * @throws {Error} When the specified refund does not exist (wrong
 *   orderId/refundId or deleted)
 * @throws {Error} When the admin identity is not valid (should be enforced by
 *   the decorator)
 */
export async function get__shoppingMallAiBackend_admin_orders_$orderId_refunds_$refundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderRefund> {
  const { admin, orderId, refundId } = props;

  // Query the refund by composite key and soft-deletion flag
  const refund =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findFirstOrThrow(
      {
        where: {
          id: refundId,
          shopping_mall_ai_backend_order_id: orderId,
          deleted_at: null,
        },
      },
    );

  // Map the record to API DTO, converting all date fields to branded ISO strings.
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
