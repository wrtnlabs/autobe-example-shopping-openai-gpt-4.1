import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update a specific delivery for an order.
 *
 * This operation updates the information for a specific delivery/shipment
 * record associated with a given order. It is typically used for updating
 * delivery status, tracking information, shipping partner data, or logistics
 * notes. Only the seller who owns the order may update the delivery. The
 * delivery can only be modified if its status is not finalized (e.g.,
 * 'complete'). All updates are logged for audit compliance. Returns the updated
 * delivery record, or throws if not found or unauthorized.
 *
 * @param props - Object containing seller auth, orderId, deliveryId, and update
 *   body.
 * @param seller - SellerPayload: Authenticated seller.
 * @param orderId - String & tags.Format<'uuid'>: The target order's UUID.
 * @param deliveryId - String & tags.Format<'uuid'>: The delivery's UUID to
 *   update.
 * @param body - IShoppingMallAiBackendOrderDelivery.IUpdate: Fields to update.
 * @returns The updated delivery record.
 * @throws {Error} If the delivery or order is not found, seller is
 *   unauthorized, or update is forbidden due to business rules.
 */
export async function put__shoppingMallAiBackend_seller_orders_$orderId_deliveries_$deliveryId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderDelivery.IUpdate;
}): Promise<IShoppingMallAiBackendOrderDelivery> {
  const { seller, orderId, deliveryId, body } = props;

  // Find the delivery record by id, order, and not deleted
  const delivery =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findFirst({
      where: {
        id: deliveryId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!delivery) throw new Error("Delivery not found");

  // Check order owned by this seller
  const order = await MyGlobal.prisma.shopping_mall_ai_backend_orders.findFirst(
    {
      where: {
        id: orderId,
        shopping_mall_ai_backend_seller_id: seller.id,
      },
    },
  );
  if (!order) throw new Error("Forbidden: Order does not belong to seller");

  // Restrict update if delivery status is 'complete' (finalized state, business rule)
  if (delivery.delivery_status === "complete") {
    throw new Error("Cannot modify finalized delivery");
  }

  // Only update fields provided; use undefined to skip unchanged
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.update({
      where: { id: delivery.id },
      data: {
        delivery_status: body.delivery_status ?? undefined,
        logistics_provider: body.logistics_provider ?? undefined,
        tracking_number: body.tracking_number ?? undefined,
        shipped_at: body.shipped_at !== undefined ? body.shipped_at : undefined,
        delivered_at:
          body.delivered_at !== undefined ? body.delivered_at : undefined,
        delivery_notes: body.delivery_notes ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_ai_backend_order_id:
      updated.shopping_mall_ai_backend_order_id,
    delivery_status: updated.delivery_status,
    logistics_provider: updated.logistics_provider ?? null,
    tracking_number: updated.tracking_number ?? null,
    shipped_at: updated.shipped_at ? toISOStringSafe(updated.shipped_at) : null,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : null,
    delivery_notes: updated.delivery_notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
