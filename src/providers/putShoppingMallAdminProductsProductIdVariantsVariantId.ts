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

export async function putShoppingMallAdminProductsProductIdVariantsVariantId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const { productId, variantId, body } = props;

  // 1. Ensure parent product exists and not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Find the variant (must belong to productId, must not be deleted)
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: variantId,
        shopping_mall_product_id: productId,
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }

  // 3. Enforce sku_code uniqueness within product (if updating)
  if (body.sku_code !== undefined && body.sku_code !== variant.sku_code) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: productId,
          sku_code: body.sku_code,
          id: {
            not: variantId,
          },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingSku) {
      throw new HttpException("Duplicate sku_code for this product", 409);
    }
  }
  // 4. Enforce option_values_hash uniqueness within product (if updating)
  if (
    body.option_values_hash !== undefined &&
    body.option_values_hash !== variant.option_values_hash
  ) {
    const existingHash =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: productId,
          option_values_hash: body.option_values_hash,
          id: {
            not: variantId,
          },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingHash) {
      throw new HttpException(
        "Duplicate option_values_hash for this product",
        409,
      );
    }
  }

  // 5. Update the variant (patch-style)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: variantId },
    data: {
      sku_code: body.sku_code !== undefined ? body.sku_code : undefined,
      bar_code: body.bar_code !== undefined ? body.bar_code : undefined,
      option_values_hash:
        body.option_values_hash !== undefined
          ? body.option_values_hash
          : undefined,
      price: body.price !== undefined ? body.price : undefined,
      stock_quantity:
        body.stock_quantity !== undefined ? body.stock_quantity : undefined,
      weight: body.weight !== undefined ? body.weight : undefined,
      updated_at: now,
    },
  });

  // 6. Return API entity (convert Date fields)
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    bar_code: updated.bar_code === null ? undefined : updated.bar_code,
    option_values_hash: updated.option_values_hash,
    price: updated.price,
    stock_quantity: updated.stock_quantity,
    weight: updated.weight,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
