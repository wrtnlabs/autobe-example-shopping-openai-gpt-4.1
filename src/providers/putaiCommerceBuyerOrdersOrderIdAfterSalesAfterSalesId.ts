import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update an after-sales case for an order (ai_commerce_order_after_sales).
 *
 * Permits an authenticated buyer to update the status, note, or type of an
 * after-sales case that they own, for a specific order. Validates that the
 * after-sales case exists, is linked to the target order, and is owned by the
 * current buyer. Fields not provided are not updated. Does not allow
 * modification of immutable fields such as id, order_id, actor_id, or
 * opened_at. Returns the updated record with all dates in string &
 * tags.Format<'date-time'> format.
 *
 * @param props - The input properties required for the update operation:
 *
 *   - Buyer: Authenticated buyer (BuyerPayload)
 *   - OrderId: UUID of the target order
 *   - AfterSalesId: UUID of the after-sales record
 *   - Body: Update DTO for after-sales case
 *
 * @returns The updated IAiCommerceOrderAfterSales DTO for the after-sales
 *   record
 * @throws {Error} If the after-sales record does not exist, or does not belong
 *   to the buyer and order
 */
export async function putaiCommerceBuyerOrdersOrderIdAfterSalesAfterSalesId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  afterSalesId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderAfterSales.IUpdate;
}): Promise<IAiCommerceOrderAfterSales> {
  const { buyer, orderId, afterSalesId, body } = props;
  // 1. Find correct after-sales record, matching authenticity and resource linkage
  const current = await MyGlobal.prisma.ai_commerce_order_after_sales.findFirst(
    {
      where: {
        id: afterSalesId,
        order_id: orderId,
        actor_id: buyer.id,
      },
    },
  );
  if (!current) {
    throw new Error(
      "After-sales record not found or not owned by authenticated buyer for the specified order",
    );
  }

  // 2. Update permissible fields only, using undefined to skip fields
  const updated = await MyGlobal.prisma.ai_commerce_order_after_sales.update({
    where: { id: current.id },
    data: {
      status: body.status ?? undefined,
      note: body.note ?? undefined,
      type: body.type ?? undefined,
    },
  });

  // 3. Return compliant DTO using string & tags.Format<'date-time'> for dates
  return {
    id: updated.id,
    order_id: updated.order_id,
    order_item_id:
      updated.order_item_id === null ? undefined : updated.order_item_id,
    actor_id: updated.actor_id,
    type: updated.type,
    status: updated.status,
    opened_at: toISOStringSafe(updated.opened_at),
    closed_at: updated.closed_at
      ? toISOStringSafe(updated.closed_at)
      : undefined,
    note: updated.note === null ? undefined : updated.note,
  };
}
