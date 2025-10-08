import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminWishlistsWishlistId(props: {
  admin: AdminPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const { admin, wishlistId } = props;
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  return {
    id: wishlist.id,
    shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
  };
}
