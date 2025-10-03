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

export async function putShoppingMallCustomerFavoriteAddressesFavoriteAddressId(props: {
  customer: CustomerPayload;
  favoriteAddressId: string & tags.Format<"uuid">;
  body: IShoppingMallFavoriteAddress.IUpdate;
}): Promise<IShoppingMallFavoriteAddress> {
  const { customer, favoriteAddressId, body } = props;

  // Find the favorite address, must be owned by customer and not soft deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_addresses.findUnique({
      where: { id: favoriteAddressId },
    });

  if (!favorite || favorite.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  if (favorite.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Cannot update another user's favorite address",
      403,
    );
  }

  // Prepare update fields
  const now = toISOStringSafe(new Date());
  // Only update provided fields; batch_label can be explicit null to clear
  const updated = await MyGlobal.prisma.shopping_mall_favorite_addresses.update(
    {
      where: { id: favoriteAddressId },
      data: {
        notification_enabled: body.notification_enabled ?? undefined,
        batch_label:
          body.batch_label === undefined ? undefined : body.batch_label,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_favorite_snapshot_id:
      updated.shopping_mall_favorite_snapshot_id,
    shopping_mall_address_id: updated.shopping_mall_address_id,
    notification_enabled: updated.notification_enabled,
    batch_label:
      typeof updated.batch_label === "undefined"
        ? undefined
        : updated.batch_label,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
