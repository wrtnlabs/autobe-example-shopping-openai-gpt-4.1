import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, productId, optionId } = props;

  // 1. Ensure product exists and is owned by seller
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
  if (!product || product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Product not found or unauthorized", 404);
  }

  // 2. Ensure option exists, belongs to product, not deleted
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: optionId,
      shopping_mall_product_id: productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!option) {
    throw new HttpException("Option not found", 404);
  }

  // 3. Check if any option values exist for the option
  const optionValues =
    await MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where: {
        shopping_mall_product_option_id: optionId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (optionValues.length > 0) {
    // Check if any variant exists for the product (as option_values_hash cannot be decoded reliably)
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: productId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (variant) {
      throw new HttpException(
        "Cannot delete option: option values are in use by product variants.",
        409,
      );
    }
  }

  // 4. Mark the option as deleted (soft delete)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_options.update({
    where: {
      id: optionId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
