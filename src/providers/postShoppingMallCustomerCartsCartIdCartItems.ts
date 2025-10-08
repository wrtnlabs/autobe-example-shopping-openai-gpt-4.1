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

export async function postShoppingMallCustomerCartsCartIdCartItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const now = toISOStringSafe(new Date());
  // 1. Validate cart ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!cart) {
    throw new HttpException(
      "Cart does not exist or is not owned by the authenticated customer",
      404,
    );
  }
  // 2. Check for duplicate SKU in cart
  const dupe = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      shopping_mall_cart_id: props.cartId,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
    },
  });
  if (dupe) {
    throw new HttpException(
      "This SKU is already added to the cart; update quantity instead.",
      409,
    );
  }
  // 3. Enforce max unique SKUs/business rules
  const cartSkuCount = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: { shopping_mall_cart_id: props.cartId },
  });
  if (cartSkuCount >= 50) {
    throw new HttpException("Cart cannot have more than 50 unique SKUs.", 400);
  }
  // 4. Validate quantity range
  if (props.body.quantity < 1 || props.body.quantity > 20) {
    throw new HttpException(
      "Each SKU must have quantity between 1 and 20.",
      400,
    );
  }
  // 5. Validate SKU exists and is active
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.body.shopping_mall_product_sku_id,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU does not exist or has been deleted.", 404);
  }
  if (sku.status !== "active") {
    throw new HttpException("SKU is not active.", 400);
  }
  // 6. Validate inventory: enough available and threshold
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_records.findFirst({
      where: { shopping_mall_product_sku_id: sku.id },
    });
  if (
    !inventory ||
    inventory.status !== "in_stock" ||
    inventory.quantity_available < props.body.quantity
  ) {
    throw new HttpException(
      "Insufficient inventory for requested SKU and quantity.",
      400,
    );
  }
  // 7. Create new cart item
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4(),
      shopping_mall_cart_id: props.cartId,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      quantity: props.body.quantity,
      unit_price_snapshot: sku.price,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    shopping_mall_cart_id: created.shopping_mall_cart_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    unit_price_snapshot: created.unit_price_snapshot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
