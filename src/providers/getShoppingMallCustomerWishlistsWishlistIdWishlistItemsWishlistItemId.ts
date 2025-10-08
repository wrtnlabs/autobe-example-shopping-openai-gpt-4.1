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

export async function getShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: Fetch the wishlist to verify customer ownership
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { shopping_mall_customer_id: true },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Access denied: Not your wishlist", 403);
  }

  // Step 2: Fetch the wishlist item with matching wishlist ID and item ID
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: { id: props.wishlistItemId },
  });
  if (!item) {
    throw new HttpException("Wishlist item not found", 404);
  }
  // Confirm matches the wishlist
  if (item.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException(
      "Item does not belong to the specified wishlist",
      404,
    );
  }
  // Return the requested shape
  return {
    id: item.id,
    shopping_mall_wishlist_id: item.shopping_mall_wishlist_id,
    shopping_mall_product_id: item.shopping_mall_product_id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  };
}
