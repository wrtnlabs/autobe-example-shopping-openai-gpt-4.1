import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  // 1. Fetch the order (must exist, must belong to this seller, not deleted, not finalized)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized: You do not own this order", 403);
  }
  if (["delivered", "cancelled"].includes(order.status)) {
    throw new HttpException(
      "This order is finalized and can no longer be updated.",
      400,
    );
  }

  // 2. Update the order (only allowed fields)
  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      status: props.body.status ?? undefined,
      business_status: props.body.business_status ?? undefined,
      shipping_address_id: props.body.shipping_address_id ?? undefined,
      payment_method_id: props.body.payment_method_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shipping_address_id: updated.shipping_address_id,
    payment_method_id: updated.payment_method_id,
    order_number: updated.order_number,
    status: updated.status,
    business_status: updated.business_status ?? undefined,
    order_total: updated.order_total,
    currency: updated.currency,
    placed_at: toISOStringSafe(updated.placed_at),
    paid_at: updated.paid_at ? toISOStringSafe(updated.paid_at) : undefined,
    fulfilled_at: updated.fulfilled_at
      ? toISOStringSafe(updated.fulfilled_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
