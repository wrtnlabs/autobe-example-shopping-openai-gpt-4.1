import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerFavoriteAddressesFavoriteAddressId(props: {
  customer: CustomerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Lookup favorite address
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_addresses.findUnique({
      where: { id: props.favoriteAddressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
      },
    });
  if (!favorite) {
    throw new HttpException("Favorite address not found", 404);
  }
  if (favorite.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this favorite address",
      403,
    );
  }
  if (favorite.deleted_at !== null) {
    throw new HttpException("Favorite address already deleted", 404);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_favorite_addresses.update({
    where: { id: props.favoriteAddressId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
