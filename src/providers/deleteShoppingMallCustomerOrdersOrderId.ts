import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId } = props;
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found or already deleted", 404);
  }
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: not the owner of the order", 403);
  }
  // Deletable status check: example (tune for business logic)
  const notDeletableStatuses = [
    "paid",
    "fulfilled",
    "completed",
    "cancelled",
    "split",
  ];
  if (notDeletableStatuses.includes(order.status)) {
    throw new HttpException(
      "Order cannot be deleted in its current status",
      400,
    );
  }
  // Evidence snapshot: save current order state before soft-delete
  await MyGlobal.prisma.shopping_mall_entity_snapshots.create({
    data: {
      id: v4(),
      entity_type: "order",
      entity_id: orderId,
      snapshot_reason: "delete",
      snapshot_actor_id: customer.id,
      snapshot_data: JSON.stringify(order),
      event_time: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Soft-delete the order
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: orderId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Audit log
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      entity_type: "order",
      entity_id: orderId,
      event_type: "delete",
      actor_id: customer.id,
      snapshot_id: null,
      event_result: "success",
      event_message: null,
      event_time: now,
      created_at: now,
    },
  });
}
