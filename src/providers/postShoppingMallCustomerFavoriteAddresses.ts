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

export async function postShoppingMallCustomerFavoriteAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteAddress.ICreate;
}): Promise<IShoppingMallFavoriteAddress> {
  // 1. Check for duplicate favorite (active)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_favorite_addresses.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_address_id: props.body.shopping_mall_address_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException("Favorite already exists for this address.", 409);
  }

  // 2. Create snapshot in shopping_mall_favorite_snapshots
  const now = toISOStringSafe(new Date());
  const snapshot =
    await MyGlobal.prisma.shopping_mall_favorite_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_address_id: props.body.shopping_mall_address_id,
        entity_type: "address",
        snapshot_data: JSON.stringify({
          shopping_mall_address_id: props.body.shopping_mall_address_id,
        }),
        created_at: now,
        deleted_at: null,
      },
    });

  // 3. Create favorite address record
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_addresses.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_favorite_snapshot_id: snapshot.id,
        shopping_mall_address_id: props.body.shopping_mall_address_id,
        notification_enabled: props.body.notification_enabled,
        batch_label: props.body.batch_label ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: favorite.id,
    shopping_mall_customer_id: favorite.shopping_mall_customer_id,
    shopping_mall_favorite_snapshot_id:
      favorite.shopping_mall_favorite_snapshot_id,
    shopping_mall_address_id: favorite.shopping_mall_address_id,
    notification_enabled: favorite.notification_enabled,
    batch_label: favorite.batch_label ?? undefined,
    created_at: toISOStringSafe(favorite.created_at),
    updated_at: toISOStringSafe(favorite.updated_at),
    deleted_at:
      favorite.deleted_at != null
        ? toISOStringSafe(favorite.deleted_at)
        : undefined,
  };
}
