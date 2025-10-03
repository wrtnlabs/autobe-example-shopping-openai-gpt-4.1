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

export async function postShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart || cart.deleted_at !== null)
    throw new HttpException("Cart not found", 404);
  if (cart.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("Forbidden: You do not own this cart", 403);
  if (cart.status === "checked_out" || cart.status === "deleted")
    throw new HttpException(
      "Cannot add items to a checked out or deleted cart",
      400,
    );

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.shopping_mall_product_id },
  });
  if (!product || product.deleted_at !== null)
    throw new HttpException("Product not found", 404);
  if (product.status.toLowerCase() !== "active")
    throw new HttpException("Product inactive", 400);

  let variant = null;
  if (
    props.body.shopping_mall_product_variant_id !== undefined &&
    props.body.shopping_mall_product_variant_id !== null
  ) {
    variant = await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shopping_mall_product_variant_id },
    });
    if (!variant || variant.deleted_at !== null)
      throw new HttpException("Variant not found", 404);
    if (
      variant.shopping_mall_product_id !== props.body.shopping_mall_product_id
    )
      throw new HttpException("Variant does not match the product", 400);
    if (variant.stock_quantity < props.body.quantity)
      throw new HttpException("Not enough stock in the variant", 400);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4(),
      shopping_mall_cart_id: props.cartId,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id ?? null,
      quantity: props.body.quantity,
      option_snapshot: props.body.option_snapshot,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_cart_id: created.shopping_mall_cart_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_product_variant_id:
      created.shopping_mall_product_variant_id ?? undefined,
    quantity: created.quantity,
    option_snapshot: created.option_snapshot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
