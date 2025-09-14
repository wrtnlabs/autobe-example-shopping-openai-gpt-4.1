import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the fields of a specific order item (ai_commerce_order_items) —
 * admin/seller only.
 *
 * This operation updates one or more fields of a specific order item within a
 * given order. Only those fields supplied in the request are updated; others
 * remain unchanged. Permission is limited to admins by decorator contract. It
 * ensures the referenced order and item exist and are not soft-deleted. The
 * update is functional, immutable, and type-safe:
 *
 * - Valid updatable fields: delivery_status, quantity, unit_price, total_price
 * - All date values are safely converted to branded ISO string format.
 * - All errors are thrown if record does not exist, or nothing is provided to
 *   update.
 *
 * @param props - Object with admin payload, orderId, itemId, and update body.
 * @param props.admin - Authenticated admin user performing the update.
 * @param props.orderId - Parent order's unique identifier (UUID).
 * @param props.itemId - Unique identifier for the order item (UUID).
 * @param props.body - IAiCommerceOrderItem.IUpdate body: one or more updatable
 *   fields.
 * @returns The updated order item as an IAiCommerceOrderItem, fully populated.
 * @throws {Error} If the order item does not exist for the specified order or
 *   if no updates specified.
 */
export async function putaiCommerceAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IAiCommerceOrderItem.IUpdate;
}): Promise<IAiCommerceOrderItem> {
  const { admin, orderId, itemId, body } = props;

  // Step 1: Fetch order item by both ID and parent order, ensuring not deleted
  const orderItem = await MyGlobal.prisma.ai_commerce_order_items.findFirst({
    where: {
      id: itemId,
      order_id: orderId,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new Error("Order item not found for provided orderId and itemId");
  }

  // Step 2: Build update data only for explicitly provided fields (type aligned)
  const update: IAiCommerceOrderItem.IUpdate = {
    ...(body.delivery_status !== undefined
      ? { delivery_status: body.delivery_status }
      : {}),
    ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
    ...(body.unit_price !== undefined ? { unit_price: body.unit_price } : {}),
    ...(body.total_price !== undefined
      ? { total_price: body.total_price }
      : {}),
  };

  if (Object.keys(update).length === 0) {
    throw new Error("No updatable fields provided");
  }

  // Step 3: Update and fetch the new entity
  const updated = await MyGlobal.prisma.ai_commerce_order_items.update({
    where: { id: itemId },
    data: update,
  });

  // Step 4: Return all fields, converting dates properly and handling undefined/null pattern
  return {
    id: updated.id,
    order_id: updated.order_id,
    product_variant_id: updated.product_variant_id,
    seller_id:
      typeof updated.seller_id === "string" ? updated.seller_id : undefined,
    item_code: updated.item_code,
    name: updated.name,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    delivery_status: updated.delivery_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
