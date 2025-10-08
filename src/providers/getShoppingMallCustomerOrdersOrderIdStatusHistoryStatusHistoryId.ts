import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdStatusHistoryStatusHistoryId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  // 1. Fetch status history record
  const record =
    await MyGlobal.prisma.shopping_mall_order_status_history.findUnique({
      where: { id: props.statusHistoryId },
    });
  if (!record) {
    throw new HttpException("Order status history not found", 404);
  }
  // 2. Validate order linkage
  if (record.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Status history does not belong to the specified order",
      404,
    );
  }
  // 3. Fetch order ensuring ownership and not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!order) {
    throw new HttpException(
      "Forbidden: You do not have access to this order's history",
      403,
    );
  }
  // 4. Map all fields to DTO, strictly match optional/null/undefined rules
  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    event_type: record.event_type,
    created_at: toISOStringSafe(record.created_at),
    actor_customer_id:
      record.actor_customer_id === null ? undefined : record.actor_customer_id,
    actor_seller_id:
      record.actor_seller_id === null ? undefined : record.actor_seller_id,
    actor_admin_id:
      record.actor_admin_id === null ? undefined : record.actor_admin_id,
    status_before:
      record.status_before === null ? undefined : record.status_before,
    status_after:
      record.status_after === null ? undefined : record.status_after,
    message: record.message === null ? undefined : record.message,
  };
}
