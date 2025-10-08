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
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      is_active: true,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not available.", 404);
  }
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    is_active: product.is_active,
    main_image_url:
      product.main_image_url === null ? undefined : product.main_image_url,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at
      ? toISOStringSafe(product.deleted_at)
      : undefined,
  };
}
