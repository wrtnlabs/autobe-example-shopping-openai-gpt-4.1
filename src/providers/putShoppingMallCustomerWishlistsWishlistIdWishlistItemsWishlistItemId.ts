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

export async function putShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  // 1. Validate ownership & association: wishlist belongs to customer, item belongs to wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { shopping_mall_customer_id: true },
  });
  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or not owned by customer", 404);
  }

  const existing =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        created_at: true,
      },
    });
  if (!existing || existing.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException("Wishlist item not found in wishlist", 404);
  }

  // 2. Update updated_at only (no other updatable fields in schema)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: { updated_at: now },
  });

  return {
    id: updated.id,
    shopping_mall_wishlist_id: updated.shopping_mall_wishlist_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
