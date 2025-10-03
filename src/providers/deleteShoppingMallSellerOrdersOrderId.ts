import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the order and all related items/shipments
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    include: {
      shopping_mall_order_items: true,
      shopping_mall_shipments: true,
    },
  });
  if (!order || order.deleted_at) {
    throw new HttpException("Order not found or already deleted", 404);
  }

  // Authorization: seller must own at least one order item
  const ownsOrderItem = order.shopping_mall_order_items.some(
    (item) => item.shopping_mall_seller_id === props.seller.id,
  );
  if (!ownsOrderItem) {
    throw new HttpException(
      "Forbidden: You can only delete your own orders",
      403,
    );
  }

  // Business rule: allow delete only if status is deletable
  const deletableStatuses = [
    "applied",
    "payment_required",
    "ordered",
    "pending",
  ];
  if (!deletableStatuses.includes(order.status)) {
    throw new HttpException("Cannot delete order in its current status.", 400);
  }

  // Cannot delete if shipments are active
  const hasActiveShipment = order.shopping_mall_shipments.some(
    (shipment) => !["cancelled", "returned"].includes(shipment.status),
  );
  if (hasActiveShipment) {
    throw new HttpException("Cannot delete order with active shipments.", 400);
  }

  // Snapshot for evidence
  await MyGlobal.prisma.shopping_mall_order_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      snapshot_data: JSON.stringify(order),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Soft-delete: mark deleted_at and updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: { deleted_at: now, updated_at: now },
  });
}
