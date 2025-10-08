import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdOptionsOptionIdValuesValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the option value, joining product option and product for existence and ownership
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
      where: {
        id: props.valueId,
        shopping_mall_product_option_id: props.optionId,
        option: {
          shopping_mall_product_id: props.productId,
          product: {
            shopping_mall_seller_id: props.seller.id,
          },
        },
      },
      include: {
        option: {
          select: {
            shopping_mall_product_id: true,
            product: {
              select: { shopping_mall_seller_id: true },
            },
          },
        },
      },
    });
  if (!optionValue) {
    throw new HttpException(
      "Product option value not found or unauthorized",
      404,
    );
  }
  // Extra ownership check for safety
  if (optionValue.option.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("You do not own this product option value.", 403);
  }
  // 2. Check for references in SKUs (junction table)
  const skuRefCount =
    await MyGlobal.prisma.shopping_mall_product_sku_option_values.count({
      where: {
        shopping_mall_product_option_value_id: props.valueId,
      },
    });
  if (skuRefCount > 0) {
    throw new HttpException(
      "Cannot delete option value: It is currently used by one or more SKUs.",
      409,
    );
  }
  // 3. Hard delete
  await MyGlobal.prisma.shopping_mall_product_option_values.delete({
    where: { id: props.valueId },
  });
}
