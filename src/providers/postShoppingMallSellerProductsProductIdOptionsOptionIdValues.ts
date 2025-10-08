import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdOptionsOptionIdValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.ICreate;
}): Promise<IShoppingMallProductOptionValue> {
  // 1. Verify the product option exists and is attached to the correct product.
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: props.optionId },
    },
  );
  if (!option || option.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Option not found for this product", 404);
  }

  // 2. Verify that the requesting seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You may only add values to your own product",
      403,
    );
  }

  // 3. Check value uniqueness within option
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
      where: {
        shopping_mall_product_option_id: props.optionId,
        value: props.body.value,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Duplicate value: each option value must be unique for this option",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_product_option_values.create({
      data: {
        id: v4(),
        shopping_mall_product_option_id: props.optionId,
        value: props.body.value,
        display_order: props.body.display_order,
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: created.id,
    shopping_mall_product_option_id: created.shopping_mall_product_option_id,
    value: created.value,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
