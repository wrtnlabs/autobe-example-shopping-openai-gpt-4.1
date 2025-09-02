import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a return request for an order item (admin/compliance only).
 *
 * Perform a soft delete of a return request record for a specific order item.
 * This sets the deleted_at timestamp on the record instead of removing it from
 * the database, preserving full business and compliance evidence. Used for
 * error correction, compliance, or operational cleanup by privileged users
 * only; all deletions are logged for regulatory oversight and audit analysis.
 *
 * Unauthorized delete attempts or attempts outside compliance scope are
 * forbidden. The operation does not remove related evidence records (order
 * history, item data, etc.), which must be preserved for audit by business
 * rule. Errors include not found (invalid IDs) and forbidden (insufficient
 * privilege).
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.orderId - Order ID associated with the return request
 * @param props.returnId - Return request ID to delete (soft delete)
 * @returns Returns nothing on success; throws on errors
 * @throws {Error} When the return request record is not found or already
 *   deleted
 * @throws {Error} When the user is not authorized or acting outside compliance
 *   scope (enforced by decorator)
 */
export async function delete__shoppingMallAiBackend_admin_orders_$orderId_returns_$returnId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  returnId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, returnId } = props;
  // Find the return request by id and orderId, and ensure not already deleted
  const orderReturn =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_returns.findFirst({
      where: {
        id: returnId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!orderReturn) {
    throw new Error("Return request not found");
  }
  // Soft delete (set deleted_at with ISO string)
  await MyGlobal.prisma.shopping_mall_ai_backend_order_returns.update({
    where: { id: returnId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return value (void)
}
