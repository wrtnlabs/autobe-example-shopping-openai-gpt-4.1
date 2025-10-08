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

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  const { customer } = props;

  // Attempt to find an existing cart for this customer
  const found = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: { shopping_mall_customer_id: customer.id },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  let cartId, createdAt, updatedAt;
  if (found) {
    cartId = found.id;
    createdAt = toISOStringSafe(found.created_at);
    updatedAt = toISOStringSafe(found.updated_at);
  } else {
    // Create a new cart for the customer
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_carts.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: customer.id,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        created_at: true,
        updated_at: true,
      },
    });
    cartId = created.id;
    createdAt = toISOStringSafe(created.created_at);
    updatedAt = toISOStringSafe(created.updated_at);
  }

  // Fetch cart items (should be empty for new cart)
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: { shopping_mall_cart_id: cartId },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      shopping_mall_product_sku_id: true,
      quantity: true,
      unit_price_snapshot: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "asc" },
  });

  // Convert cartItems to API format (all dates as ISO strings)
  const items = cartItems.map((item) => ({
    id: item.id,
    shopping_mall_cart_id: item.shopping_mall_cart_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    quantity: item.quantity,
    unit_price_snapshot: item.unit_price_snapshot,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    id: cartId,
    shopping_mall_customer_id: customer.id,
    created_at: toISOStringSafe(createdAt),
    updated_at: toISOStringSafe(updatedAt),
    cart_items: items.length > 0 ? items : undefined,
  };
}
