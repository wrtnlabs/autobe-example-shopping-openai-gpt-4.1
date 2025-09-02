import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete a refund record for an order, retaining audit evidence.
 *
 * Logically deletes (soft deletes) a refund record associated with an order.
 * This operation sets the `deleted_at` timestamp for the refund, preserving it
 * for compliance and audit, but removing it from normal query results. Only an
 * authenticated admin can execute this operation.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the soft-delete
 * @param props.orderId - The UUID of the order associated with the refund
 * @param props.refundId - The UUID of the refund to be soft-deleted
 * @returns Void
 * @throws {Error} If the refund is not found or already deleted
 */
export async function delete__shoppingMallAiBackend_admin_orders_$orderId_refunds_$refundId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, refundId } = props;

  // Ensure the refund exists and is not already soft-deleted
  const refund =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.findFirst({
      where: {
        id: refundId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!refund) {
    throw new Error("Refund record not found or already deleted");
  }

  // Soft-delete by setting deleted_at to the current time
  await MyGlobal.prisma.shopping_mall_ai_backend_order_refunds.update({
    where: {
      id: refundId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return (void)
}
