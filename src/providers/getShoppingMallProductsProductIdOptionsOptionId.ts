import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";

export async function getShoppingMallProductsProductIdOptionsOptionId(props: {
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductOption> {
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: props.optionId,
      shopping_mall_product_id: props.productId,
      // No deleted_at check here, it's on the parent product
    },
  });

  if (!option) {
    throw new HttpException("Product option not found", 404);
  }

  // Check parent product existence & active status
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: option.shopping_mall_product_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Option not accessible or parent product not active",
      404,
    );
  }

  return {
    id: option.id,
    shopping_mall_product_id: option.shopping_mall_product_id,
    name: option.name,
    display_order: option.display_order,
    created_at: toISOStringSafe(option.created_at),
    updated_at: toISOStringSafe(option.updated_at),
  };
}
