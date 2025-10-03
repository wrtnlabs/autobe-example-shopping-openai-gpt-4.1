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

export async function getShoppingMallCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  // Verify cart existence and ownership together with cartItem fetch for atomicity
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_cart_id: props.cartId,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Cart item not found.", 404);
  }
  // Check cart ownership by joining cart query
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      deleted_at: null,
    },
    select: {
      shopping_mall_customer_id: true,
    },
  });
  if (!cart || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cart item not found.", 404);
  }
  return {
    id: item.id,
    shopping_mall_cart_id: item.shopping_mall_cart_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      typeof item.shopping_mall_product_variant_id === "undefined"
        ? undefined
        : item.shopping_mall_product_variant_id === null
          ? null
          : item.shopping_mall_product_variant_id,
    quantity: item.quantity,
    option_snapshot: item.option_snapshot,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      typeof item.deleted_at === "undefined" || item.deleted_at === null
        ? undefined
        : toISOStringSafe(item.deleted_at),
  };
}
