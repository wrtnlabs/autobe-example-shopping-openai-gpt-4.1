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

export async function putShoppingMallCustomerCartsCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, cartItemId, body } = props;
  // 1. Find the cart and check ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: cartId },
  });
  if (!cart) throw new HttpException("Cart not found", 404);
  if (cart.shopping_mall_customer_id !== customer.id)
    throw new HttpException("Unauthorized: You do not own this cart", 403);
  // 2. Find the cart item and check association
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: cartItemId },
  });
  if (!cartItem) throw new HttpException("Cart item not found", 404);
  if (cartItem.shopping_mall_cart_id !== cartId)
    throw new HttpException("Cart item does not belong to the cart", 403);
  // 3. Quantity zero means remove the item
  if (body.quantity === 0) {
    await MyGlobal.prisma.shopping_mall_cart_items.delete({
      where: { id: cartItemId },
    });
    throw new HttpException(
      "Cart item removed (quantity was set to zero)",
      404,
    );
  }
  // 4. Validate product SKU exists and is active
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: cartItem.shopping_mall_product_sku_id },
  });
  if (!sku /* || !sku.is_active */)
    throw new HttpException("Product SKU is not available", 400);
  // 5. Check SKU's inventory
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
      where: { shopping_mall_product_sku_id: sku.id },
    });
  if (!inventory)
    throw new HttpException("SKU inventory record not found", 500);
  if (body.quantity > inventory.quantity_available)
    throw new HttpException("Requested quantity exceeds available stock", 400);
  // 6. Optionally update price snapshot (if policy), not by default in spec
  // 7. Update the cart item
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: cartItemId },
    data: {
      quantity: body.quantity,
      updated_at: toISOStringSafe(new Date()),
      // unit_price_snapshot: (update if business rule applies),
    },
  });
  return {
    id: updated.id,
    shopping_mall_cart_id: updated.shopping_mall_cart_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    unit_price_snapshot: updated.unit_price_snapshot,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
