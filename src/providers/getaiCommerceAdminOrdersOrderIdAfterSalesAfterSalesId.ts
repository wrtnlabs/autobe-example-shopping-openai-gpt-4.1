import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific after-sales case for an order
 * (ai_commerce_order_after_sales).
 *
 * This endpoint retrieves detailed information about a specific after-sales
 * service case for a given order. Only admins may access this endpoint. It
 * validates existence, correct parent order association, and maps all DB values
 * to the strict IAiCommerceOrderAfterSales contract. All DateTime fields are
 * converted to proper ISO strings, with nullable/optional fields handled
 * exactly according to the DTO.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated admin user performing the operation.
 *   - OrderId: UUID of the parent order to which the after-sales belongs.
 *   - AfterSalesId: UUID of the after-sales service case to retrieve.
 *
 * @returns The detailed IAiCommerceOrderAfterSales object for the specified
 *   after-sales service case.
 * @throws {Error} When the after-sales case does not exist for the given ID, or
 *   is not associated to the provided order ID.
 */
export async function getaiCommerceAdminOrdersOrderIdAfterSalesAfterSalesId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAfterSales> {
  const { orderId, afterSalesId } = props;
  const afterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst({
      where: {
        id: afterSalesId,
      },
    });
  if (!afterSales) {
    throw new Error("After-sales case not found");
  }
  if (afterSales.order_id !== orderId) {
    throw new Error("After-sales case does not belong to this order");
  }
  return {
    id: afterSales.id,
    order_id: afterSales.order_id,
    order_item_id:
      afterSales.order_item_id === null ||
      afterSales.order_item_id === undefined
        ? undefined
        : afterSales.order_item_id,
    actor_id: afterSales.actor_id,
    type: afterSales.type,
    status: afterSales.status,
    opened_at: toISOStringSafe(afterSales.opened_at),
    closed_at:
      afterSales.closed_at === null || afterSales.closed_at === undefined
        ? undefined
        : toISOStringSafe(afterSales.closed_at),
    note:
      afterSales.note === null || afterSales.note === undefined
        ? undefined
        : afterSales.note,
  } satisfies IAiCommerceOrderAfterSales;
}
