import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdPaymentsPaymentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderPayment> {
  const payment = await MyGlobal.prisma.shopping_mall_order_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { id: props.orderId, deleted_at: null },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_seller_id === props.seller.id) {
    // authorized
  } else if (order.shopping_mall_seller_id === null) {
    const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
      select: { shopping_mall_product_sku_id: true },
    });
    const skuIds = items.map((item) => item.shopping_mall_product_sku_id);
    if (skuIds.length === 0) {
      throw new HttpException("Forbidden: No order items for this order", 403);
    }
    const productIdList =
      await MyGlobal.prisma.shopping_mall_product_skus.findMany({
        where: { id: { in: skuIds } },
        select: { shopping_mall_product_id: true },
      });
    const productIds = productIdList.map((sku) => sku.shopping_mall_product_id);
    if (productIds.length === 0) {
      throw new HttpException("Forbidden: No products for order items", 403);
    }
    const sellerOwns = await MyGlobal.prisma.shopping_mall_products.count({
      where: {
        id: { in: productIds },
        shopping_mall_seller_id: props.seller.id,
      },
    });
    if (sellerOwns === 0) {
      throw new HttpException(
        "Forbidden: Cannot access payment details for unrelated order",
        403,
      );
    }
  } else {
    throw new HttpException(
      "Forbidden: Cannot access payment details for unrelated order",
      403,
    );
  }

  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    order_payment_method_id: payment.order_payment_method_id,
    payment_ref: payment.payment_ref,
    payment_type: payment.payment_type,
    status: payment.status,
    paid_amount: payment.paid_amount,
    currency: payment.currency,
    paid_at: payment.paid_at ? toISOStringSafe(payment.paid_at) : undefined,
    reconciliation_at: payment.reconciliation_at
      ? toISOStringSafe(payment.reconciliation_at)
      : undefined,
    fail_reason: payment.fail_reason ?? undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at
      ? toISOStringSafe(payment.deleted_at)
      : undefined,
  };
}
