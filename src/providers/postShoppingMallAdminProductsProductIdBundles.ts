import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdBundles(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductBundle.ICreate;
}): Promise<IShoppingMallProductBundle> {
  // Step 1: Check duplicate bundle name for product
  const exists = await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
    where: {
      shopping_mall_product_id: props.productId,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException("Duplicate bundle name for this product", 409);
  }
  // Step 2: Create new bundle
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.shopping_mall_product_bundles.create({
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
    select: {
      id: true,
      shopping_mall_product_id: true,
      name: true,
      bundle_type: true,
      description: true,
      position: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: result.id,
    shopping_mall_product_id: result.shopping_mall_product_id,
    name: result.name,
    bundle_type: result.bundle_type,
    description: result.description ?? null,
    position: result.position,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
