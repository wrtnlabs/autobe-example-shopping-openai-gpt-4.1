import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { admin, orderId, body } = props;

  // 1. Check order existence and mutability
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Prevent editing if already processed/finalized
  const finalizedStatuses = [
    "paid",
    "in_fulfillment",
    "shipping",
    "delivered",
    "completed",
    "cancelled",
    "split",
  ] as const;
  if (
    finalizedStatuses.includes(
      order.status as (typeof finalizedStatuses)[number],
    )
  ) {
    throw new HttpException("Order cannot be edited in current status", 409);
  }

  // 2. Check product existence, status, channel match, not deleted/discontinued
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: body.shopping_mall_product_id,
      shopping_mall_channel_id: order.shopping_mall_channel_id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!product)
    throw new HttpException(
      "Product not available or not in this channel",
      404,
    );

  // (for now, seller match is not enforced in description)

  // 3. If variant given, check it exists and belongs to the product
  let variantIdValue: string | null | undefined = undefined;
  if (body.shopping_mall_product_variant_id != null) {
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          id: body.shopping_mall_product_variant_id,
          shopping_mall_product_id: product.id,
          deleted_at: null,
        },
      });
    if (!variant)
      throw new HttpException(
        "Product variant not found for this product",
        404,
      );
    variantIdValue = body.shopping_mall_product_variant_id;
  }

  // 4. Create order item
  const now = toISOStringSafe(new Date());
  const id = v4();
  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: id,
      shopping_mall_order_id: orderId,
      shopping_mall_product_id: product.id,
      shopping_mall_product_variant_id: variantIdValue ?? undefined,
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      quantity: body.quantity,
      unit_price: body.unit_price,
      final_price: body.final_price,
      discount_snapshot: body.discount_snapshot ?? undefined,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Return API DTO-compliant object, all values as strings, no Date, correct null/undefined for optionals
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      created.shopping_mall_product_variant_id === null
        ? undefined
        : created.shopping_mall_product_variant_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    final_price: created.final_price,
    discount_snapshot:
      created.discount_snapshot === null
        ? undefined
        : created.discount_snapshot,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
