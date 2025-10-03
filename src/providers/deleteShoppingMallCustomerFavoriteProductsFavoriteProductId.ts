import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerFavoriteProductsFavoriteProductId(props: {
  customer: CustomerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the favorite record and verify ownership and not already deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_products.findFirst({
      where: {
        id: props.favoriteProductId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (favorite === null) {
    throw new HttpException(
      "Favorite product not found, already deleted, or does not belong to you",
      404,
    );
  }
  // Soft delete: set deleted_at to now (ISO8601 string)
  await MyGlobal.prisma.shopping_mall_favorite_products.update({
    where: { id: props.favoriteProductId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
