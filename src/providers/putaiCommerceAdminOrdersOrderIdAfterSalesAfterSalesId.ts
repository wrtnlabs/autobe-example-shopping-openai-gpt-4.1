import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an after-sales case for an order (ai_commerce_order_after_sales).
 *
 * This function permits a system administrator (admin) to update certain
 * details of a specific after-sales case such as changing status, note, or type
 * for a given order. The update is allowed only when the after-sales case is
 * associated with the provided orderId, ensuring relation and integrity. Only
 * fields allowed by business rules (status, note, type) are updated. Required
 * authorization is enforced.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user (must be of type
 *   AdminPayload)
 * @param props.orderId - UUID of the parent order containing the after-sales
 *   case
 * @param props.afterSalesId - UUID of the after-sales case to be updated
 * @param props.body - Fields to update per IAiCommerceOrderAfterSales.IUpdate
 *   (status, note, type)
 * @returns The updated IAiCommerceOrderAfterSales record for the specified
 *   after-sales case
 * @throws {Error} If the after-sales case is not found by afterSalesId
 * @throws {Error} If the after-sales case does not belong to the specified
 *   orderId
 */
export async function putaiCommerceAdminOrdersOrderIdAfterSalesAfterSalesId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IUpdate;
}): Promise<IAiCommerceOrderAfterSales> {
  const { admin, orderId, afterSalesId, body } = props;
  // Step 1: Find the after-sales case by afterSalesId
  const existing =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findUnique({
      where: { id: afterSalesId },
    });
  if (!existing) {
    throw new Error("After-sales case not found");
  }
  // Step 2: Validate association to the given orderId
  if (existing.order_id !== orderId) {
    throw new Error(
      "Association error: after-sales case does not belong to the specified order",
    );
  }
  // Step 3: Update allowed fields (status, note, type) if present in body
  const updated = await MyGlobal.prisma.ai_commerce_order_after_sales.update({
    where: { id: afterSalesId },
    data: {
      status: body.status ?? undefined,
      note: body.note ?? undefined,
      type: body.type ?? undefined,
    },
  });
  // Step 4: Return the updated object, converting all date fields appropriately
  return {
    id: updated.id,
    order_id: updated.order_id,
    order_item_id: updated.order_item_id ?? undefined,
    actor_id: updated.actor_id,
    type: updated.type,
    status: updated.status,
    opened_at: toISOStringSafe(updated.opened_at),
    closed_at: updated.closed_at
      ? toISOStringSafe(updated.closed_at)
      : undefined,
    note: updated.note ?? undefined,
  };
}
