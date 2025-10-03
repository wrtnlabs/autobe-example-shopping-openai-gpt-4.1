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

export async function postShoppingMallCustomerFavoriteProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallFavoriteProduct.ICreate;
}): Promise<IShoppingMallFavoriteProduct> {
  const now = toISOStringSafe(new Date());
  const customerId = props.customer.id;
  const {
    shopping_mall_product_id,
    shopping_mall_favorite_snapshot_id,
    notification_enabled,
    batch_label,
  } = props.body;

  // 1. Validate product exists and is not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: shopping_mall_product_id,
      deleted_at: null,
    },
  });
  if (!product)
    throw new HttpException("Product not found or is deleted.", 404);

  // 2. Validate snapshot exists
  const snapshot =
    await MyGlobal.prisma.shopping_mall_favorite_snapshots.findFirst({
      where: {
        id: shopping_mall_favorite_snapshot_id,
        deleted_at: null,
      },
    });
  if (!snapshot)
    throw new HttpException("Favorite snapshot not found or is deleted.", 400);

  // 3. Enforce uniqueness constraint (customer, product, NOT deleted)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_favorite_products.findFirst({
      where: {
        shopping_mall_customer_id: customerId,
        shopping_mall_product_id,
        deleted_at: null,
      },
    });
  if (duplicate)
    throw new HttpException("Product already favorited by this customer.", 409);

  // 4. Create favorite
  const created = await MyGlobal.prisma.shopping_mall_favorite_products.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customerId,
      shopping_mall_product_id,
      shopping_mall_favorite_snapshot_id,
      notification_enabled,
      batch_label: batch_label ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_favorite_snapshot_id:
      created.shopping_mall_favorite_snapshot_id,
    notification_enabled: created.notification_enabled,
    batch_label: created.batch_label,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
