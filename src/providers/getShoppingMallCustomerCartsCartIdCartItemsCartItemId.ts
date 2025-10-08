import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCartsCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  // 1. Validate cart existence and ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: This cart does not belong to you", 403);
  }
  // 2. Fetch the cart item, ensuring it belongs to the cart
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
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
  if (!item) {
    throw new HttpException("Cart item not found", 404);
  }
  // Ensure the item is in the requested cart
  if (item.shopping_mall_cart_id !== props.cartId) {
    throw new HttpException("Cart item does not belong to the cart", 404);
  }
  // Map and return output
  return {
    id: item.id,
    shopping_mall_cart_id: item.shopping_mall_cart_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    quantity: item.quantity,
    unit_price_snapshot: item.unit_price_snapshot,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  };
}
