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

export async function putShoppingMallCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Step 1: Fetch the cart and validate ownership/status
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!cart || cart.deleted_at !== null) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this cart", 403);
  }
  if (cart.status !== "active") {
    throw new HttpException("Cart is not active for modification", 409);
  }

  // Step 2: Fetch cart item & validate it belongs to the cart
  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      option_snapshot: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!item || item.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }
  if (item.shopping_mall_cart_id !== cart.id) {
    throw new HttpException("Item does not belong to this cart", 409);
  }

  // If updating variant, check it is valid and get product id
  let variant;
  if (
    "shopping_mall_product_variant_id" in props.body &&
    props.body.shopping_mall_product_variant_id
  ) {
    variant = await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shopping_mall_product_variant_id },
      select: {
        id: true,
        stock_quantity: true,
        shopping_mall_product_id: true,
      },
    });
    if (!variant) {
      throw new HttpException("Variant does not exist", 409);
    }
    // Variant must be for same product as item
    if (variant.shopping_mall_product_id !== item.shopping_mall_product_id) {
      throw new HttpException("Variant is not for this product", 409);
    }
  }

  // New quantity (should be validated for > 0 and <= stock)
  let quantity = item.quantity;
  if ("quantity" in props.body && props.body.quantity !== undefined) {
    quantity = props.body.quantity;
    if (quantity <= 0) {
      throw new HttpException("Quantity must be greater than 0", 409);
    }
    // If variant update or quantity update, check stock constrain
    if (variant) {
      if (quantity > variant.stock_quantity) {
        throw new HttpException("Variant has insufficient stock", 409);
      }
    } else if (item.shopping_mall_product_variant_id) {
      // If variant not updated, check current one
      const oldVariant =
        await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
          where: { id: item.shopping_mall_product_variant_id },
          select: { stock_quantity: true },
        });
      if (!oldVariant || quantity > oldVariant.stock_quantity) {
        throw new HttpException("Insufficient stock for current variant", 409);
      }
    }
    // else: no variant, no stock check needed
  }
  // Option snapshot
  let option_snapshot = item.option_snapshot;
  if (
    "option_snapshot" in props.body &&
    props.body.option_snapshot !== undefined
  ) {
    option_snapshot = props.body.option_snapshot;
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: item.id },
    data: {
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id === undefined
          ? undefined
          : props.body.shopping_mall_product_variant_id,
      quantity: quantity,
      option_snapshot: option_snapshot,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      option_snapshot: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    shopping_mall_cart_id: updated.shopping_mall_cart_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      updated.shopping_mall_product_variant_id ?? undefined,
    quantity: updated.quantity,
    option_snapshot: updated.option_snapshot,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
