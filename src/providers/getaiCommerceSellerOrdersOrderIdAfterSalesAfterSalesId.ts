import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific after-sales case for an order
 * (ai_commerce_order_after_sales).
 *
 * This operation returns the full details of an after-sales service case—such
 * as return, exchange, or dispute—for a specific order and after-sales case ID,
 * only to the legitimate seller responsible for the order. It verifies that the
 * after-sales record exists, is associated with the correct order, and that the
 * requesting seller is indeed the seller of record for at least one item in the
 * order. If any validation fails, an error is thrown for unauthorized access or
 * not found. Date/time values are returned as ISO 8601 date strings.
 *
 * Authorization: Only the seller responsible for the order items may access
 * this after-sales record. Soft-deleted or unauthorized sellers are rejected.
 *
 * @param props - Properties for the request
 * @param props.seller - Authenticated seller (must match order's seller)
 * @param props.orderId - UUID of the parent order
 * @param props.afterSalesId - UUID of the after-sales case to retrieve
 * @returns The full IAiCommerceOrderAfterSales record
 * @throws {Error} If the order or after-sales record is not found, or the
 *   seller is unauthorized
 */
export async function getaiCommerceSellerOrdersOrderIdAfterSalesAfterSalesId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceOrderAfterSales> {
  const { seller, orderId, afterSalesId } = props;

  // 1. Validate order exists
  const order = await MyGlobal.prisma.ai_commerce_orders.findFirst({
    where: { id: orderId },
  });
  if (!order) throw new Error("Not found");

  // 2. Validate after-sales record exists and matches order
  const afterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst({
      where: { id: afterSalesId, order_id: orderId },
    });
  if (!afterSales) throw new Error("Not found");

  // 3. Retrieve seller row via buyer_id from payload
  const dbSeller = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: {
      buyer_id: seller.id,
      deleted_at: null,
      status: { in: ["active", "under_review", "suspended"] },
    },
  });
  if (!dbSeller) throw new Error("Unauthorized: Not a valid seller");

  // 4. Confirm seller is associated with any order item
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: { order_id: orderId, seller_id: dbSeller.id },
  });
  if (!orderItem) throw new Error("Unauthorized: Not the seller of this order");

  // 5. Map result fields per DTO rules, converting all dates to ISO 8601
  return {
    id: afterSales.id,
    order_id: afterSales.order_id,
    order_item_id: afterSales.order_item_id ?? undefined,
    actor_id: afterSales.actor_id,
    type: afterSales.type,
    status: afterSales.status,
    opened_at: toISOStringSafe(afterSales.opened_at),
    closed_at: afterSales.closed_at
      ? toISOStringSafe(afterSales.closed_at)
      : undefined,
    note: afterSales.note ?? undefined,
  };
}
