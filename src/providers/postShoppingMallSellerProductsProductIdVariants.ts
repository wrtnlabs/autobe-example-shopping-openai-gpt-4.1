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

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const { seller, productId, body } = props;

  // Lookup parent product (must exist, be active, and not deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: productId,
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Parent product not found or is deleted", 404);
  }
  // Only the owning seller may create the variant
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Enforce uniqueness for sku_code within productId
  const existing =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: productId,
        sku_code: body.sku_code,
      },
    });
  if (existing) {
    throw new HttpException("Duplicate sku_code for this product", 409);
  }
  // Enforce uniqueness for option_values_hash (unique option combination)
  const existingOption =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: productId,
        option_values_hash: body.option_values_hash,
      },
    });
  if (existingOption) {
    throw new HttpException(
      "Duplicate option_values_hash for this product",
      409,
    );
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: {
      id: v4(),
      shopping_mall_product_id: productId,
      sku_code: body.sku_code,
      bar_code: body.bar_code ?? null,
      option_values_hash: body.option_values_hash,
      price: body.price,
      stock_quantity: body.stock_quantity,
      weight: body.weight,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    sku_code: created.sku_code,
    bar_code: created.bar_code ?? undefined,
    option_values_hash: created.option_values_hash,
    price: created.price,
    stock_quantity: created.stock_quantity,
    weight: created.weight,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
