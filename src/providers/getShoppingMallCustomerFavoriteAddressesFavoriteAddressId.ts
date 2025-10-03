import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerFavoriteAddressesFavoriteAddressId(props: {
  customer: CustomerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFavoriteAddress> {
  // Find the favorite address entry for the given id and current customer, not deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_addresses.findFirst({
      where: {
        id: props.favoriteAddressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (!favorite) {
    throw new HttpException("Favorite address not found", 404);
  }

  // DTO expectations: batch_label?: string | null | undefined, deleted_at?: string | null | undefined
  // Prisma returns undefined if not present, so map accordingly.
  return {
    id: favorite.id,
    shopping_mall_customer_id: favorite.shopping_mall_customer_id,
    shopping_mall_favorite_snapshot_id:
      favorite.shopping_mall_favorite_snapshot_id,
    shopping_mall_address_id: favorite.shopping_mall_address_id,
    notification_enabled: favorite.notification_enabled,
    batch_label:
      favorite.batch_label !== undefined ? favorite.batch_label : undefined,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at: favorite.deleted_at
      ? toISOStringSafe(favorite.deleted_at)
      : null,
  };
}
