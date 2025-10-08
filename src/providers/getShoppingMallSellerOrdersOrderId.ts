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

export async function getShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { id: props.orderId, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }
  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Seller does not own this order.",
      403,
    );
  }
  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_seller_id: order.shopping_mall_seller_id,
    shipping_address_id: order.shipping_address_id,
    payment_method_id: order.payment_method_id,
    order_number: order.order_number,
    status: order.status,
    business_status: order.business_status ?? undefined,
    order_total: order.order_total,
    currency: order.currency,
    placed_at: toISOStringSafe(order.placed_at),
    paid_at: order.paid_at ? toISOStringSafe(order.paid_at) : undefined,
    fulfilled_at: order.fulfilled_at
      ? toISOStringSafe(order.fulfilled_at)
      : undefined,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };
}
