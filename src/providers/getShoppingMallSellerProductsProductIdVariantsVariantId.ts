import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const { seller, productId, variantId } = props;

  // 1. Fetch product to verify existence and ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or deleted", 404);
  }
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "You are not authorized to access this product",
      403,
    );
  }

  // 2. Fetch variant; check product relationship and not soft-deleted
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: variantId,
        shopping_mall_product_id: productId,
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException(
      "Variant not found or not associated with the specified product",
      404,
    );
  }

  // 3. Return the variant as per IShoppingMallProductVariant structure
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
