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
  const { customer, orderId, itemId } = props;

  // Fetch order item and parent order in one query
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: itemId },
    include: {
      order: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
          status: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  if (orderItem.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "This order item does not belong to the specified order",
      404,
    );
  }

  if (orderItem.order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "You do not have permission to delete items from this order",
      403,
    );
  }

  // Only allow if order is not fulfilled or closed
  const disallowedStatuses = [
    "shipped",
    "delivered",
    "refunded",
    "cancelled",
    "disputed",
  ];
  if (disallowedStatuses.includes(orderItem.refund_status)) {
    throw new HttpException(
      "Order item cannot be deleted in its current state",
      409,
    );
  }

  // The item may already be soft-deleted
  if (orderItem.deleted_at) {
    throw new HttpException("Order item is already deleted", 409);
  }

  // Soft-delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: itemId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
