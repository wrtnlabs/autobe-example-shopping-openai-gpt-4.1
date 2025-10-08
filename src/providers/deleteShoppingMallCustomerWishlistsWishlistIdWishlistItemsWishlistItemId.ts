import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check wishlist ownership
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: not the owner of this wishlist", 403);
  }

  // 2. Confirm the wishlist item exists and is linked to this wishlist
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: { id: true, shopping_mall_wishlist_id: true },
    });
  if (
    !wishlistItem ||
    wishlistItem.shopping_mall_wishlist_id !== props.wishlistId
  ) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // 3. Hard-delete the wishlist item
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: { id: props.wishlistItemId },
  });

  return;
}
