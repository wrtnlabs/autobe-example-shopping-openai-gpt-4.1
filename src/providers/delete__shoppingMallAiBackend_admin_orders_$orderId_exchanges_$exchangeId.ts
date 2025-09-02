import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete an order item exchange for evidence retention and compliance.
 *
 * Marks an exchange as deleted in the system using a soft delete (sets the
 * deleted_at timestamp), preserving the full history and evidence for future
 * compliance and audit requests. Returns no body on success. Only the involved
 * customer or an administrator may execute this operation, and all actions are
 * recorded in the audit trail. The exchange remains in the database but is
 * excluded from normal queries and user access except for authorized purposes.
 *
 * @param props - Request properties
 * @param props.admin - Admin user performing the soft deletion (authenticated
 *   via AdminAuth), already validated for active status
 * @param props.orderId - The UUID of the order to which the exchange belongs
 * @param props.exchangeId - The UUID of the exchange record to be soft deleted
 * @returns Void
 * @throws {Error} When the exchange does not exist for the given order, or is
 *   already deleted
 */
export async function delete__shoppingMallAiBackend_admin_orders_$orderId_exchanges_$exchangeId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  exchangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, exchangeId } = props;

  // Find the exchange belonging to the order, must not be previously deleted
  const exchange =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.findFirst({
      where: {
        id: exchangeId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!exchange) {
    throw new Error(
      "Order exchange record not found for this order, or already deleted.",
    );
  }

  // Soft-delete: set the deleted_at timestamp (compliance/audit evidence)
  await MyGlobal.prisma.shopping_mall_ai_backend_order_exchanges.update({
    where: {
      id: exchangeId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
