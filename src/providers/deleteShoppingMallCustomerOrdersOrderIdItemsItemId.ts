import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find order item by ID, ensure it belongs to the provided order ID.
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.itemId },
  });
  if (!orderItem || orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found.", 404);
  }

  // 2. Retrieve the order for the customer check.
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found or not owned by you.", 404);
  }

  // 3. Business logic: Only allow if status is in allowed deletion state
  // Let's assume status === 'ordered' is deletable; block paid, shipped, delivered, etc.
  // Allowed deletion status can be expanded if required by business
  if (orderItem.status !== "ordered") {
    throw new HttpException(
      "This order item cannot be deleted, current status does not allow deletion.",
      400,
    );
  }

  // 4. Delete the order item (hard delete)
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: props.itemId },
  });

  // 5. (Optional) Audit-log the deletion – not implemented here (out of scope for this schema/DTO)
}
