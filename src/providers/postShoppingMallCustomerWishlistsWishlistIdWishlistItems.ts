import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // 1. Check that the wishlist exists and is owned by the customer, and not deleted
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found or not owned by you", 403);
  }

  // 2. Ensure this product is not already in the wishlist (compound PK)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: {
        shopping_mall_wishlist_id_shopping_mall_product_id: {
          shopping_mall_wishlist_id: props.wishlistId,
          shopping_mall_product_id: props.body.shopping_mall_product_id,
        },
      },
      select: { id: true },
    });
  if (duplicate) {
    throw new HttpException("This product is already in your wishlist.", 409);
  }

  // 3. Product validation: exists, is_active, not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }

  // 4. Create wishlist item
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: {
      id: v4(),
      shopping_mall_wishlist_id: props.wishlistId,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_wishlist_id: true,
      shopping_mall_product_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: result.id,
    shopping_mall_wishlist_id: result.shopping_mall_wishlist_id,
    shopping_mall_product_id: result.shopping_mall_product_id,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
