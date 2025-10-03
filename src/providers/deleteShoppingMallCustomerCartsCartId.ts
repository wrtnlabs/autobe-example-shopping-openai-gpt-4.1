import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the cart and ensure it is not deleted
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
  });

  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.deleted_at !== null) {
    throw new HttpException("Cart is already deleted", 409);
  }

  // Step 2: Check ownership
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: only cart owner can delete", 403);
  }

  // Step 3: Soft delete
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
