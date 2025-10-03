import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerFavoriteProductsFavoriteProductId(props: {
  customer: CustomerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteProduct> {
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_products.findFirst({
      where: {
        id: props.favoriteProductId,
        deleted_at: null,
        shopping_mall_customer_id: props.customer.id,
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
    batch_label: favorite.batch_label ?? undefined,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : null,
  };
}
