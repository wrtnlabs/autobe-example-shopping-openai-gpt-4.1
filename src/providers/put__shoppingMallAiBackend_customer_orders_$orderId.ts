import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Updates permitted fields on an existing order identified by orderId.
 * (shopping_mall_ai_backend_orders)
 *
 * This operation updates an existing order in the
 * shopping_mall_ai_backend_orders table. The authenticated customer may update
 * their own order's allowed fields ("status" and "updated_at") only if the
 * order is not deleted, closed, or cancelled. All date handling is strictly
 * type-safe (string & tags.Format<'date-time'>) and never uses native Date.
 * Permission, business logic, and compliance are strictly enforced:
 * unauthorized access throws Error, non-updatable state throws Error. Only the
 * two valid fields in schema (status, updated_at) are updated; no extra
 * contact/delivery data is persisted (these fields do not exist in DB and are
 * ignored).
 *
 * @param props - Customer: CustomerPayload - Authenticated customer orderId:
 *   string & tags.Format<'uuid'> - ID of the order to update body:
 *   IShoppingMallAiBackendOrder.IUpdate - Permitted update fields (see schema;
 *   only status & updated_at are effective)
 * @returns IShoppingMallAiBackendOrder - The updated order
 * @throws {Error} If the order is not found, not owned by customer, or already
 *   closed/cancelled/deleted
 */
export async function put__shoppingMallAiBackend_customer_orders_$orderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrder.IUpdate;
}): Promise<IShoppingMallAiBackendOrder> {
  const { customer, orderId, body } = props;

  // Find order by ID
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
    });
  if (!order) throw new Error("Order not found");
  if (order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Unauthorized: Cannot update another customer's order");
  }
  if (
    order.deleted_at !== null ||
    order.status === "closed" ||
    order.status === "cancelled"
  ) {
    throw new Error(
      "Order cannot be updated: already closed/cancelled/deleted",
    );
  }
  // Only update allowed DB fields. Ignore unsupported DTO fields (such as delivery_notes, contact_name, etc.).
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_orders.update({
    where: { id: orderId },
    data: {
      // Only change status if provided
      status: body.status ?? undefined,
      // Always update updated_at (default to now if not provided)
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : toISOStringSafe(new Date()),
    },
  });

  // Return with strict type-safe conversion of all date/datetime fields
  return {
    id: updated.id,
    shopping_mall_ai_backend_customer_id:
      updated.shopping_mall_ai_backend_customer_id,
    shopping_mall_ai_backend_channel_id:
      updated.shopping_mall_ai_backend_channel_id,
    shopping_mall_ai_backend_seller_id:
      updated.shopping_mall_ai_backend_seller_id ?? null,
    code: updated.code,
    status: updated.status,
    total_amount: updated.total_amount,
    currency: updated.currency,
    ordered_at: toISOStringSafe(updated.ordered_at),
    confirmed_at: updated.confirmed_at
      ? toISOStringSafe(updated.confirmed_at)
      : null,
    cancelled_at: updated.cancelled_at
      ? toISOStringSafe(updated.cancelled_at)
      : null,
    closed_at: updated.closed_at ? toISOStringSafe(updated.closed_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
