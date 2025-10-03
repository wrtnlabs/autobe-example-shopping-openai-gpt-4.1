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

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // 1. Get product, make sure it exists and belongs to this seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_mall_seller_id !== props.seller.id)
    throw new HttpException(
      "Unauthorized: Only the owning seller can update product variants",
      403,
    );

  // 2. Update the variant
  const now = toISOStringSafe(new Date());
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
      },
      data: {
        ...(props.body.sku_code !== undefined
          ? { sku_code: props.body.sku_code }
          : {}),
        ...(props.body.bar_code !== undefined
          ? { bar_code: props.body.bar_code }
          : {}),
        ...(props.body.option_values_hash !== undefined
          ? { option_values_hash: props.body.option_values_hash }
          : {}),
        ...(props.body.price !== undefined ? { price: props.body.price } : {}),
        ...(props.body.stock_quantity !== undefined
          ? { stock_quantity: props.body.stock_quantity }
          : {}),
        ...(props.body.weight !== undefined
          ? { weight: props.body.weight }
          : {}),
        updated_at: now,
      },
    });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate SKU code or option hash for this product",
        409,
      );
    }
    throw err;
  }

  // 3. Return type fixing/formatting as per DTO
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    bar_code: updated.bar_code ?? undefined,
    option_values_hash: updated.option_values_hash,
    price: updated.price,
    stock_quantity: updated.stock_quantity,
    weight: updated.weight,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
