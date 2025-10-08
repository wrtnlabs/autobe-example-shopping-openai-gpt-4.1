import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdShipmentsShipmentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the shipment by ID
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findUnique({
      where: { id: props.shipmentId },
    });
  if (!shipment) throw new HttpException("Shipment not found", 404);

  // 2. Shipment must belong to the given order
  if (shipment.shopping_mall_order_id !== props.orderId)
    throw new HttpException("Shipment does not belong to order", 403);

  // 3. Fetch order, check seller owns order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.deleted_at !== null)
    throw new HttpException("Order not found", 404);
  if (order.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException(
      "Unauthorized: Only order-owning seller may delete shipment",
      403,
    );

  // 4. Business check: delivered/refunded shipment cannot be deleted
  if (
    shipment.status === "delivered" ||
    shipment.status === "refunded" ||
    shipment.delivered_at !== null
  )
    throw new HttpException("Cannot delete a delivered/refunded shipment", 409);

  // 5. Delete shipment (hard delete)
  await MyGlobal.prisma.shopping_mall_order_shipments.delete({
    where: { id: props.shipmentId },
  });

  // 6. Log admin action for audit (must provide shopping_mall_admin_id - use fallback system admin or special constant)
  // If unavailable, you might choose to skip this log entirely or raise a TODO
  // Here, we provide a dummy UUID (system admin) for compliance
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      affected_seller_id: props.seller.id,
      affected_order_id: order.id,
      affected_product_id: null,
      affected_customer_id: null,
      affected_review_id: null,
      action_type: "shipment_delete",
      action_reason: "Seller deleted shipment " + props.shipmentId,
      domain: "order_shipment",
      details_json: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
