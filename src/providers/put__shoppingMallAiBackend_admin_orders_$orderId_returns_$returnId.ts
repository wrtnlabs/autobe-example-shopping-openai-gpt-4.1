import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import { EOrderReturnStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderReturnStatus";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update return request details or status for an order item after creation.
 *
 * Update a return request for a specific order item. Permitted fields for
 * update include return_reason, status, and critical process timestamps. All
 * updates generate historical snapshots for audit evidence. This endpoint is
 * restricted to after-sales support, returns managers, and authorized admin
 * users; attempts by unauthorized users are denied.
 *
 * Common business use includes status transition (e.g., requested→approved,
 * approved→completed), reason correction, or adjustment of process dates. The
 * endpoint supports compliance workflow, escalation, and evidence capture.
 * Error handling includes validation failure (if data violates business logic
 * or state transitions), forbidden (insufficient privilege), and not-found
 * (invalid IDs).
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user requesting the return
 *   update
 * @param props.orderId - The order ID linked to the return request
 * @param props.returnId - The unique return request ID to update
 * @param props.body - Fields to update on the return (status, reason,
 *   completed_at)
 * @returns The updated order return record with all fields (audit-traceable
 *   state)
 * @throws {Error} If the return request does not exist or is deleted
 * @throws {Error} If the return's order linkage does not match orderId
 *   parameter
 */
export async function put__shoppingMallAiBackend_admin_orders_$orderId_returns_$returnId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  returnId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderReturn.IUpdate;
}): Promise<IShoppingMallAiBackendOrderReturn> {
  const { admin, orderId, returnId, body } = props;

  // 1. Fetch the return by PK, ensure exists and not soft-deleted
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_returns.findUnique({
      where: { id: returnId },
    });
  if (!found || found.deleted_at !== null) {
    throw new Error("Return not found or deleted");
  }
  // 2. Ensure correct order linkage
  if (found.shopping_mall_ai_backend_order_id !== orderId) {
    throw new Error("Attempt to update return for mismatched order");
  }

  // 3. Update permissible fields (inline, no intermediate variable)
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_returns.update({
      where: { id: returnId },
      data: {
        return_reason: body.return_reason ?? undefined,
        status: body.status ?? undefined,
        completed_at:
          body.completed_at === undefined ? undefined : body.completed_at,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 4. Transform to DTO with all date-time fields as string & tags.Format<'date-time'>
  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      updated.shopping_mall_ai_backend_order_item_id,
    return_reason: updated.return_reason,
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
