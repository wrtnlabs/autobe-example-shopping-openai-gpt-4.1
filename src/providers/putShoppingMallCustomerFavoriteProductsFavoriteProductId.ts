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

export async function putShoppingMallCustomerFavoriteProductsFavoriteProductId(props: {
  customer: CustomerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  body: IShoppingMallFavoriteProduct.IUpdate;
}): Promise<IShoppingMallFavoriteProduct> {
  const { customer, favoriteProductId, body } = props;

  // Step 1: Ownership check and existence
  const favorite =
    await MyGlobal.prisma.shopping_mall_favorite_products.findFirst({
      where: {
        id: favoriteProductId,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_product_id: true,
        shopping_mall_favorite_snapshot_id: true,
        notification_enabled: true,
        batch_label: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!favorite) {
    throw new HttpException(
      "Favorite product not found or you do not have permission to update it.",
      404,
    );
  }

  // Step 2: Update mutable fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_favorite_products.update({
    where: { id: favoriteProductId },
    data: {
      notification_enabled: body.notification_enabled,
      batch_label: body.batch_label,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_product_id: true,
      shopping_mall_favorite_snapshot_id: true,
      notification_enabled: true,
      batch_label: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_favorite_snapshot_id:
      updated.shopping_mall_favorite_snapshot_id,
    notification_enabled: updated.notification_enabled,
    batch_label: updated.batch_label ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
