import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminWishlistsWishlistId(props: {
  admin: AdminPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Schema does not have a deleted_at field for soft delete.
  // Perform hard delete instead.
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: { id: props.wishlistId },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.wishlistId },
  });
}
