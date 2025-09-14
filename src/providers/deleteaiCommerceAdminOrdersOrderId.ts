import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete (mark deleted) an order (ai_commerce_orders) by orderId
 *
 * This operation marks an order as deleted by updating its deleted_at field to
 * the current timestamp, preserving data for compliance, audit, and historical
 * review. No order data is physically removed; the soft delete is logical
 * only.
 *
 * Only accessible by admins. All operations are persisted for legal/audit
 * trail.
 *
 * @param props - Properties for deletion
 * @param props.admin - Authenticated admin performing the operation
 *   (authorization required)
 * @param props.orderId - UUID of the order to mark as deleted
 * @returns Void
 * @throws {Error} If order does not exist or is inaccessible
 */
export async function deleteaiCommerceAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { orderId } = props;
  // Confirm existence (throws if not found)
  await MyGlobal.prisma.ai_commerce_orders.findFirstOrThrow({
    where: { id: orderId },
    select: { id: true },
  });
  // Prepare timestamp for soft delete
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ai_commerce_orders.update({
    where: { id: orderId },
    data: { deleted_at: deletedAt },
  });
}
