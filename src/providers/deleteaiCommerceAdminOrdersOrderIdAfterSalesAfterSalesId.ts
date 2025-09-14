import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an after-sales case for an order (ai_commerce_order_after_sales, hard
 * delete).
 *
 * Permanently removes a specific after-sales case record linked to an order.
 * Operates on the ai_commerce_order_after_sales table and always performs a
 * hard delete (no soft-delete column exists).
 *
 * Only callable by system administrators or those with explicit rights
 * (enforced by AdminPayload requirement). Additional business rules (like
 * status checks) can be applied, but are not specified as mandatory in this
 * logic. Ensures the after-sales record exists, is associated with the provided
 * order, and then removes it entirely. Returns no value on success.
 *
 * @param props - Props for operation
 * @param props.admin - The authenticated system administrator performing the
 *   delete
 * @param props.orderId - The parent order's unique identifier (UUID)
 * @param props.afterSalesId - The unique after-sales case to delete (UUID)
 * @returns Void
 * @throws {Error} If the after-sales case does not exist
 * @throws {Error} If the after-sales case is not associated with the specified
 *   order
 */
export async function deleteaiCommerceAdminOrdersOrderIdAfterSalesAfterSalesId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { orderId, afterSalesId } = props;

  // 1. Fetch after-sales case by ID
  const afterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findUnique({
      where: { id: afterSalesId },
    });
  if (!afterSales) {
    throw new Error("After-sales case not found");
  }

  // 2. Check association to the specified order
  if (afterSales.order_id !== orderId) {
    throw new Error("After-sales case does not belong to specified order");
  }

  // 3. (Optionally, enforce business status rules - e.g., block delete for certain statuses)
  // Not specified in API contract - so allowed for all for this implementation.

  // 4. Hard delete operation (permanent removal)
  await MyGlobal.prisma.ai_commerce_order_after_sales.delete({
    where: { id: afterSalesId },
  });
  // No return value per contract (void)
  return;
}
