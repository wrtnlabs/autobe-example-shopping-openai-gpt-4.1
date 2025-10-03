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

export async function postShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Order ownership and existence check
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      status: true,
    },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Unauthorized: Cannot add item to this order", 403);
  }
  // 2. Order must be modifiable (status: applied or payment_required only)
  if (order.status !== "applied" && order.status !== "payment_required") {
    throw new HttpException(
      "Order cannot be modified after payment or fulfillment.",
      409,
    );
  }
  // 3. Product existence and validity check
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.shopping_mall_product_id },
    select: {
      id: true,
      status: true,
      business_status: true,
      shopping_mall_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.status !== "Active" || product.business_status !== "Approval") {
    throw new HttpException("Product is not available for ordering", 409);
  }
  if (product.shopping_mall_seller_id !== props.body.shopping_mall_seller_id) {
    throw new HttpException("Seller does not own this product", 409);
  }
  // 4. Variant validation (if provided)
  let variantId: string | null = null;
  if (
    props.body.shopping_mall_product_variant_id !== undefined &&
    props.body.shopping_mall_product_variant_id !== null
  ) {
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
        where: { id: props.body.shopping_mall_product_variant_id },
        select: { id: true, shopping_mall_product_id: true },
      });
    if (!variant || variant.shopping_mall_product_id !== product.id) {
      throw new HttpException("Invalid product variant selected", 409);
    }
    variantId = variant.id;
  }
  // 5. Create new order item
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_variant_id: variantId,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      final_price: props.body.final_price,
      discount_snapshot: props.body.discount_snapshot ?? undefined,
      status: props.body.status,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_variant_id: true,
      shopping_mall_seller_id: true,
      quantity: true,
      unit_price: true,
      final_price: true,
      discount_snapshot: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      created.shopping_mall_product_variant_id ?? undefined,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    final_price: created.final_price,
    discount_snapshot: created.discount_snapshot ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
