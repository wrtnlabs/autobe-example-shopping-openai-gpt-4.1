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

export async function putShoppingMallSellerProductsProductIdOptionsOptionIdValuesValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IUpdate;
}): Promise<IShoppingMallProductOptionValue> {
  // Step 1: Fetch the option value and join relations for validation
  const value =
    await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
      where: {
        id: props.valueId,
        shopping_mall_product_option_id: props.optionId,
        option: {
          id: props.optionId,
          product: {
            id: props.productId,
          },
        },
      },
      include: {
        option: {
          include: {
            product: true,
          },
        },
      },
    });

  if (!value || !value.option || !value.option.product) {
    throw new HttpException("Option value not found", 404);
  }

  // Step 2: Soft-delete checks (enforce only active product/option)
  if (value.option.product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 404);
  }
  // Correct: only product has deleted_at per included type, so we remove value.option.deleted_at check

  // Step 3: Only allow the seller who owns the product
  if (value.option.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Step 4: Check for duplicate value in same option (if updating value)
  if (
    props.body.value !== undefined &&
    props.body.value !== value.value // Only check if effectively changing
  ) {
    const exists =
      await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
        where: {
          id: { not: props.valueId },
          shopping_mall_product_option_id: props.optionId,
          value: props.body.value,
        },
      });
    if (exists) {
      throw new HttpException(
        "Duplicate option value in this option group",
        409,
      );
    }
  }

  // Step 5: Update fields, with updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_product_option_values.update({
      where: { id: props.valueId },
      data: {
        value: props.body.value ?? undefined,
        display_order: props.body.display_order ?? undefined,
        updated_at: now,
      },
    });

  // Step 6: Return the full DTO (all required fields, correct types)
  return {
    id: updated.id,
    shopping_mall_product_option_id: updated.shopping_mall_product_option_id,
    value: updated.value,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
