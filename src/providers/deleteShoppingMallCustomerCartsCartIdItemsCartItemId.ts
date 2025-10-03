import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find cart item (active only, not already deleted, matches cartId)
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_cart_id: props.cartId,
      deleted_at: null,
    },
    include: {
      cart: true,
    },
  });
  if (!item) {
    throw new HttpException("Cart item not found or already deleted", 404);
  }

  // Step 2: Check that the cart belongs to the customer and cart is active/updatable
  if (
    !item.cart ||
    item.cart.deleted_at !== null ||
    item.cart.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Unauthorized or cart is inaccessible", 403);
  }

  // Can't update cart item if cart is not in an updatable state
  if (item.cart.status === "checked_out" || item.cart.status === "expired") {
    throw new HttpException(
      "Cannot remove items from a checked out or expired cart",
      400,
    );
  }

  // Step 3: Soft-delete (mark deleted_at)
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: item.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
