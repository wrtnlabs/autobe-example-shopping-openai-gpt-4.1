import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdBundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.ICreate;
}): Promise<IShoppingMallProductBundle> {
  // Step 1: Look up the product, ensure it exists, not deleted, and owned by seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or permission denied.", 404);
  }

  // Step 2: Check uniqueness of bundle name (ignore deleted bundles)
  const existing =
    await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "A bundle with this name already exists for the product.",
      409,
    );
  }

  // Step 3: Insert
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_bundles.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      name: props.body.name,
      bundle_type: props.body.bundle_type,
      description: props.body.description ?? null,
      position: props.body.position,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    bundle_type: created.bundle_type,
    description: created.description ?? null,
    position: created.position,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
