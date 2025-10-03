import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Lookup order by orderId
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Only allow if order is in an editable status
  if (
    [
      "paid",
      "in_fulfillment",
      "shipping",
      "delivered",
      "completed",
      "cancelled",
      "split",
    ].includes(order.status)
  ) {
    throw new HttpException(
      "Order is not editable and cannot accept new items",
      400,
    );
  }

  // Verify seller is authorized and correct for this product/item
  if (props.body.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: you can only add items as your own seller account",
      403,
    );
  }

  // 2. Lookup product, must exist and belong to this seller and be not discontinued
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.shopping_mall_product_id },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: cannot add someone else's product",
      403,
    );
  }
  if (["Discontinued", "Paused", "Deleted"].includes(product.status)) {
    throw new HttpException("Cannot add discontinued or deleted product", 400);
  }

  // 3. If variant is supplied, validate it belongs to this product
  if (
    props.body.shopping_mall_product_variant_id !== undefined &&
    props.body.shopping_mall_product_variant_id !== null
  ) {
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
        where: { id: props.body.shopping_mall_product_variant_id },
      });
    if (!variant || variant.shopping_mall_product_id !== product.id) {
      throw new HttpException("Invalid product variant for this product", 404);
    }
  }

  // 4. Insert order item
  const now = toISOStringSafe(new Date());
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.orderId,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id ?? null,
      shopping_mall_seller_id: props.seller.id,
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      final_price: props.body.final_price,
      discount_snapshot: props.body.discount_snapshot ?? null,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_id: orderItem.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      orderItem.shopping_mall_product_variant_id ?? null,
    shopping_mall_seller_id: orderItem.shopping_mall_seller_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    final_price: orderItem.final_price,
    discount_snapshot: orderItem.discount_snapshot ?? null,
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at: orderItem.deleted_at
      ? toISOStringSafe(orderItem.deleted_at)
      : null,
  };
}
