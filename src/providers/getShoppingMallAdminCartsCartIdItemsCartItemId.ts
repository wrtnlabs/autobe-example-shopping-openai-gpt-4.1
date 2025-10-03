import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCartsCartIdItemsCartItemId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      shopping_mall_cart_id: props.cartId,
      deleted_at: null,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  return {
    id: cartItem.id,
    shopping_mall_cart_id: cartItem.shopping_mall_cart_id,
    shopping_mall_product_id: cartItem.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      cartItem.shopping_mall_product_variant_id ?? undefined,
    quantity: cartItem.quantity,
    option_snapshot: cartItem.option_snapshot,
    created_at: toISOStringSafe(cartItem.created_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    deleted_at: cartItem.deleted_at
      ? toISOStringSafe(cartItem.deleted_at)
      : undefined,
  };
}
