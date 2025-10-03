import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdVariantsVariantId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
      },
    });
  if (!variant) {
    throw new HttpException(
      "Variant not found or does not belong to product",
      404,
    );
  }
  return {
    id: variant.id,
    shopping_mall_product_id: variant.shopping_mall_product_id,
    sku_code: variant.sku_code,
    bar_code: variant.bar_code ?? undefined,
    option_values_hash: variant.option_values_hash,
    price: variant.price,
    stock_quantity: variant.stock_quantity,
    weight: variant.weight,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at
      ? toISOStringSafe(variant.deleted_at)
      : undefined,
  };
}
