import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Logically (soft) delete a specific order by UUID (ai_commerce_orders table).
 *
 * This function marks an order as logically removed by updating its
 * 'deleted_at' timestamp, ensuring it remains for audit and compliance, but is
 * inaccessible for further business use. The order is only deletable if it
 * belongs to the requesting buyer and is not already paid, fulfilled, or closed
 * according to platform policy. Attempts to delete any ineligible or non-owned
 * order will result in an error. All deletions are subject to strict business
 * rule enforcement.
 *
 * @param props - The request object containing
 *
 *   - Buyer: Authenticated buyer context for authorization (BuyerPayload)
 *   - OrderId: UUID of the order to logically delete
 *
 * @returns Void
 * @throws {Error} If the order does not exist, is not owned by the buyer, is
 *   already deleted, or is not eligible for deletion per business rules
 */
export async function deleteaiCommerceBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, orderId } = props;

  // Find order by id, linked to buyer, and not previously soft-deleted
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });

  if (order === null) {
    throw new Error("Order not found, access denied, or already deleted.");
  }

  // Only deletable if NOT paid or fulfilled/delivered/closed per business status rules
  const forbiddenStatuses = [
    "paid",
    "payment_pending",
    "fulfilled",
    "shipped",
    "delivered",
    "closed",
    "cancelled",
  ];
  if (order.paid_amount > 0) {
    throw new Error("Cannot delete: Order already paid.");
  }
  if (forbiddenStatuses.includes(order.status)) {
    throw new Error("Cannot delete: Order status does not permit deletion.");
  }

  // Soft delete: update the order's deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.ai_commerce_orders.update({
    where: { id: orderId },
    data: { deleted_at: deletedAt },
  });
  // No return value (void)
}
