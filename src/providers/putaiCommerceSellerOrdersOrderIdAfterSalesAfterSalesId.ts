import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an after-sales case for an order (ai_commerce_order_after_sales).
 *
 * Allows an authenticated seller to update status, note, or type of a specific
 * after-sales event, provided that the after-sales case belongs to the given
 * order and the seller is authorized (i.e., is the seller for at least one item
 * in the target order). All update operations are strictly permission-checked;
 * unauthorized attempts are rejected.
 *
 * @param props - Seller: The authenticated seller (seller.id is
 *   ai_commerce_buyer.id, matches order item). orderId: The UUID of the order
 *   containing the after-sales case. afterSalesId: The UUID of the target
 *   after-sales case. body: IAiCommerceOrderAfterSales.IUpdate update DTO; may
 *   include status, note, or type.
 * @returns The updated after-sales case as IAiCommerceOrderAfterSales.
 * @throws {Error} If after-sales case is not found, does not belong to order,
 *   or seller not permitted.
 */
export async function putaiCommerceSellerOrdersOrderIdAfterSalesAfterSalesId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IUpdate;
}): Promise<IAiCommerceOrderAfterSales> {
  const { seller, orderId, afterSalesId, body } = props;

  // 1. Fetch the after-sales record and ensure it belongs to the order
  const afterSales =
    await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst({
      where: { id: afterSalesId, order_id: orderId },
    });
  if (!afterSales) {
    throw new Error("After-sales case not found for this order");
  }

  // 2. Fetch all order items to check if this seller is one of the sellers
  const orderItems = await MyGlobal.prisma.ai_commerce_order_items.findMany({
    where: { order_id: orderId },
  });
  const sellerIsPermitted = orderItems.some(
    (item) => item.seller_id === seller.id,
  );
  if (!sellerIsPermitted) {
    throw new Error(
      "You do not have permission to update this after-sales case",
    );
  }

  // 3. Update allowed fields only if provided
  const updated = await MyGlobal.prisma.ai_commerce_order_after_sales.update({
    where: { id: afterSalesId },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
    },
  });

  // 4. Convert all Date fields using toISOStringSafe, preserve null/undefined for nullable props
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
