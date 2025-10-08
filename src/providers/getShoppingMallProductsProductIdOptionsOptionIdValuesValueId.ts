import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";

export async function getShoppingMallProductsProductIdOptionsOptionIdValuesValueId(props: {
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductOptionValue> {
  const { productId, optionId, valueId } = props;

  // Step 1: Find option value and check it belongs to this optionId
  const value =
    await MyGlobal.prisma.shopping_mall_product_option_values.findUnique({
      where: { id: valueId },
    });
  if (!value || value.shopping_mall_product_option_id !== optionId) {
    throw new HttpException(
      "Option value not found or does not belong to this option",
      404,
    );
  }

  // Step 2: Check that the option belongs to the provided productId
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: optionId },
    },
  );
  if (!option || option.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Option not found or does not belong to this product",
      404,
    );
  }

  // Step 3: Prepare result with all required fields
  return {
    id: value.id,
    shopping_mall_product_option_id: value.shopping_mall_product_option_id,
    value: value.value,
    display_order: value.display_order,
    created_at: toISOStringSafe(value.created_at),
    updated_at: toISOStringSafe(value.updated_at),
  };
}
