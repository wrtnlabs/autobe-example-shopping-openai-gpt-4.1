import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve detailed data for a specific order item by order and item ID. Prisma
 * table: shopping_mall_ai_backend_order_items.
 *
 * This operation retrieves the detailed information for a single order item
 * based on its order and item IDs, referencing the
 * shopping_mall_ai_backend_order_items table in Prisma. It is used to display
 * complete line-item details for after-sales service, fulfillment, customer
 * support, or compliance investigations. Returns all available fields,
 * including product title, quantity, pricing, options, bundles, and status.
 * Only the purchaser, related seller, or admin can access details for privacy
 * and business security.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request. Must
 *   only access order items for their own orders.
 * @param props.orderId - Unique identifier of the order (UUID format).
 * @param props.itemId - Identifier for the specific item within the order (UUID
 *   format).
 * @returns The detailed order item, containing all fields and snapshot info per
 *   schema.
 * @throws {Error} When item not found, or requester does not own the parent
 *   order
 */
export async function get__shoppingMallAiBackend_customer_orders_$orderId_items_$itemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendOrderItem> {
  const { customer, orderId, itemId } = props;

  // Fetch the order item by composite key and ensure not deleted
  const orderItem =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!orderItem) throw new Error("Order item not found");

  // Fetch parent order and check if the customer owns it
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        shopping_mall_ai_backend_customer_id: customer.id,
      },
    },
  );
  if (!order)
    throw new Error("Forbidden: Customer cannot access this order item");

  // Map all fields, converting Date fields properly
  return {
    id: orderItem.id as string & tags.Format<"uuid">,
    order_id: orderItem.shopping_mall_ai_backend_order_id as string &
      tags.Format<"uuid">,
    product_id: orderItem.shopping_mall_ai_backend_product_id as string &
      tags.Format<"uuid">,
    product_option_id:
      orderItem.shopping_mall_ai_backend_product_option_id ?? null,
    product_bundle_id:
      orderItem.shopping_mall_ai_backend_product_bundle_id ?? null,
    product_title: orderItem.product_title,
    quantity: orderItem.quantity as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    unit_price: orderItem.unit_price,
    discount_amount: orderItem.discount_amount,
    final_amount: orderItem.final_amount,
    currency: orderItem.currency,
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at: orderItem.deleted_at
      ? toISOStringSafe(orderItem.deleted_at)
      : null,
  };
}
