import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at) {
    throw new HttpException("Product not found", 404);
  }
  return {
    id: product.id,
    shopping_mall_seller_id: product.shopping_mall_seller_id,
    shopping_mall_channel_id: product.shopping_mall_channel_id,
    shopping_mall_section_id: product.shopping_mall_section_id,
    shopping_mall_category_id: product.shopping_mall_category_id,
    code: product.code,
    name: product.name,
    status: product.status,
    business_status: product.business_status,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at
      ? toISOStringSafe(product.deleted_at)
      : undefined,
  };
}
