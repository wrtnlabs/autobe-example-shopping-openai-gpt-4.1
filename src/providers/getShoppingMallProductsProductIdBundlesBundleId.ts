import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundle";

export async function getShoppingMallProductsProductIdBundlesBundleId(props: {
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductBundle> {
  const record = await MyGlobal.prisma.shopping_mall_product_bundles.findFirst({
    where: {
      id: props.bundleId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!record)
    throw new HttpException(
      "Product bundle not found for given productId and bundleId.",
      404,
    );
  return {
    id: record.id,
    shopping_mall_product_id: record.shopping_mall_product_id,
    name: record.name,
    bundle_type: record.bundle_type,
    description:
      record.description !== undefined && record.description !== null
        ? record.description
        : undefined,
    position: record.position,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== undefined && record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
