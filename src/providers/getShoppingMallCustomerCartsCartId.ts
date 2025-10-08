import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  // Fetch cart by id; schema does not provide deleted_at field
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your cart.", 403);
  }
  // Fetch cart items for this cart
  const items = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: { shopping_mall_cart_id: props.cartId },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      shopping_mall_product_sku_id: true,
      quantity: true,
      unit_price_snapshot: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: cart.id,
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    cart_items:
      items.length > 0
        ? items.map((item) => ({
            id: item.id,
            shopping_mall_cart_id: item.shopping_mall_cart_id,
            shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
            quantity: item.quantity,
            unit_price_snapshot: item.unit_price_snapshot,
            created_at: toISOStringSafe(item.created_at),
            updated_at: toISOStringSafe(item.updated_at),
          }))
        : undefined,
  };
}
