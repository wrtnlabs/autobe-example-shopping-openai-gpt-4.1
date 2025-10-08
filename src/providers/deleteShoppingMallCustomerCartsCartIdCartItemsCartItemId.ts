import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the cart and verify ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or unauthorized", 403);
  }

  // Step 2: Find the cart item and verify it belongs to the cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_cart_id: props.cartId,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found in this cart", 404);
  }

  // Step 3: Delete the cart item (permanent)
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: {
      id: props.cartItemId,
    },
  });

  // Step 4: Update cart's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: {
      id: props.cartId,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
