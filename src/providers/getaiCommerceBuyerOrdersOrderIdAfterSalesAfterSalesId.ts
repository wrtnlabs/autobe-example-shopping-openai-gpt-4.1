import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve details for a specific after-sales case of an order
 * (ai_commerce_order_after_sales)
 *
 * This endpoint returns the full details of a single after-sales service case
 * for a buyer's order. It enforces strict authorization: only the buyer who
 * owns the order may retrieve after-sales cases for that order via this
 * endpoint. The function verifies that the order exists, is active (not
 * deleted), and is owned by the requesting buyer. It then looks up the
 * after-sales record by its ID, ensuring it belongs to the referenced order. If
 * not found, it throws a descriptive error.
 *
 * Fields are mapped exactly to IAiCommerceOrderAfterSales. Date/time fields are
 * provided in ISO 8601 format, and all optional/nullable fields are handled
 * precisely according to the DTO contract.
 *
 * @param props - Operation props
 * @param props.buyer - Authenticated buyer (must be the owner of the order)
 * @param props.orderId - ID of the parent order (UUID)
 * @param props.afterSalesId - ID of the after-sales case (UUID)
 * @returns The after-sales record for this order and case ID
 * @throws {Error} If the order does not exist, is not active, or does not
 *   belong to the requesting buyer
 * @throws {Error} If the after-sales record does not exist, or is not
 *   associated to this order
 */
export async function getaiCommerceBuyerOrdersOrderIdAfterSalesAfterSalesId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAfterSales> {
  const { buyer, orderId, afterSalesId } = props;

  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
      buyer_id: buyer.id,
    },
  });
  if (!order) {
    throw new Error("Order not found, not owned by this buyer, or deleted");
  }

  const afterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst({
      where: {
        id: afterSalesId,
        order_id: orderId,
      },
    });
  if (!afterSales) {
    throw new Error("After-sales record not found for this order");
  }

  return {
    id: afterSales.id,
    order_id: afterSales.order_id,
    order_item_id:
      afterSales.order_item_id === null ? undefined : afterSales.order_item_id,
    actor_id: afterSales.actor_id,
    type: afterSales.type,
    status: afterSales.status,
    opened_at: toISOStringSafe(afterSales.opened_at),
    closed_at:
      afterSales.closed_at === null || afterSales.closed_at === undefined
        ? undefined
        : toISOStringSafe(afterSales.closed_at),
    note: afterSales.note === null ? undefined : afterSales.note,
  };
}
