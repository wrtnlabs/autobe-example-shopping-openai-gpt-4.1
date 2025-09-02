import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderReturn";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the details of a specific return request for an order item.
 *
 * This operation returns all business attributes of the return, including
 * linked order item, return reason, status, audit timestamps, and processing
 * outcomes. Only authorized admins may access full return details; result is
 * used for after-sales review, compliance, and audit workflows.
 *
 * @param props - The parameters for this operation
 * @param props.admin - The authenticated admin context (must be active and
 *   authorized)
 * @param props.orderId - The UUID of the order related to this return
 * @param props.returnId - The UUID of the specific return request within the
 *   order
 * @returns Full business and audit details of the order return record
 * @throws {Error} If no such return exists for given order/returnId or it is
 *   soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_orders_$orderId_returns_$returnId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  returnId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderReturn> {
  const { orderId, returnId } = props;

  // Find the return request linked to both order and return ID, if not soft-deleted
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_returns.findFirstOrThrow(
      {
        where: {
          id: returnId,
          shopping_mall_ai_backend_order_id: orderId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_order_id: true,
          shopping_mall_ai_backend_order_item_id: true,
          return_reason: true,
          status: true,
          requested_at: true,
          processed_at: true,
          completed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: found.id,
    shopping_mall_ai_backend_order_id: found.shopping_mall_ai_backend_order_id,
    shopping_mall_ai_backend_order_item_id:
      found.shopping_mall_ai_backend_order_item_id,
    return_reason: found.return_reason,
    status: found.status,
    requested_at: toISOStringSafe(found.requested_at),
    processed_at: found.processed_at
      ? toISOStringSafe(found.processed_at)
      : null,
    completed_at: found.completed_at
      ? toISOStringSafe(found.completed_at)
      : null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
