import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminFavoriteProductsFavoriteProductId(props: {
  admin: AdminPayload;
  favoriteProductId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteProduct> {
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_products.findUnique({
      where: {
        id: props.favoriteProductId,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new HttpException("Favorite product not found", 404);
  }
  return {
    id: favorite.id,
    shopping_mall_customer_id: favorite.shopping_mall_customer_id,
    shopping_mall_product_id: favorite.shopping_mall_product_id,
    shopping_mall_favorite_snapshot_id:
      favorite.shopping_mall_favorite_snapshot_id,
    notification_enabled: favorite.notification_enabled,
    batch_label:
      favorite.batch_label === undefined ? undefined : favorite.batch_label,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : undefined,
  };
}
