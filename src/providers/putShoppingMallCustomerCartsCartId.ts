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

export async function putShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  const { customer, cartId, body } = props;

  // Step 1: Retrieve cart and check existence/ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: cartId },
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
  if (cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Cart does not belong to this customer",
      403,
    );
  }

  // Step 2: Update only updated_at
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: cartId },
    data: {
      updated_at: body.updated_at,
    },
  });

  // Step 3: Refetch cart and items
  const updated = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: cartId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      created_at: true,
      updated_at: true,
      shopping_mall_cart_items: true,
    },
  });
  if (!updated) {
    throw new HttpException("Cart not found", 404);
  }
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    cart_items: updated.shopping_mall_cart_items.map((item) => ({
      id: item.id,
      shopping_mall_cart_id: item.shopping_mall_cart_id,
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      quantity: item.quantity,
      unit_price_snapshot: item.unit_price_snapshot,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
