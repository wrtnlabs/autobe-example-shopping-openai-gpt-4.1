import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Check that order exists and is owned by the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your order", 403);
  }

  // 2. Get the order item and verify parent linkage
  const item =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
    });
  if (item.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found for this order", 404);
  }

  // 3. Only editable statuses may be updated
  const nonEditableStatuses = [
    "fulfilled",
    "shipped",
    "cancelled",
    "completed",
    "returned",
  ];
  if (nonEditableStatuses.includes(item.status)) {
    throw new HttpException(
      "Order item cannot be modified after fulfillment/cancellation",
      400,
    );
  }

  // 4. Only proceed with updatable fields
  const canUpdateStatus = Object.prototype.hasOwnProperty.call(
    props.body,
    "status",
  );
  const canUpdateFinalPrice = Object.prototype.hasOwnProperty.call(
    props.body,
    "final_price",
  );
  if (!canUpdateStatus && !canUpdateFinalPrice) {
    throw new HttpException("No updatable fields provided", 400);
  }

  // 5. Only include fields present in body
  const now = toISOStringSafe(new Date());
  const update: {
    status?: string;
    final_price?: number;
    updated_at: string & tags.Format<"date-time">;
  } = { updated_at: now };
  if (canUpdateStatus) update.status = props.body.status;
  if (canUpdateFinalPrice) update.final_price = props.body.final_price;

  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: update,
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      updated.shopping_mall_product_variant_id === null
        ? undefined
        : updated.shopping_mall_product_variant_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    final_price: updated.final_price,
    discount_snapshot:
      updated.discount_snapshot === null
        ? undefined
        : updated.discount_snapshot,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
