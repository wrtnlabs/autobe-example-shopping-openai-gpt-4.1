import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdOptionsOptionIdValuesValueId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  valueId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IUpdate;
}): Promise<IShoppingMallProductOptionValue> {
  const now = toISOStringSafe(new Date());
  // Step 1: Verify the option value exists and traverses to correct option/product
  const value =
    await MyGlobal.prisma.shopping_mall_product_option_values.findUnique({
      where: { id: props.valueId },
      include: {
        option: {
          include: { product: true },
        },
      },
    });
  if (
    !value ||
    value.option.id !== props.optionId ||
    value.option.product.id !== props.productId
  ) {
    throw new HttpException(
      "Option value not found for the given product/option/value IDs",
      404,
    );
  }

  // Uniqueness: value must be unique per option id
  if (props.body.value !== undefined && props.body.value !== value.value) {
    const exists =
      await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
        where: {
          shopping_mall_product_option_id: props.optionId,
          value: props.body.value,
          id: { not: props.valueId },
        },
      });
    if (exists) {
      throw new HttpException("Duplicate option value for this option", 409);
    }
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_product_option_values.update({
      where: { id: props.valueId },
      data: {
        value: props.body.value,
        display_order: props.body.display_order,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    shopping_mall_product_option_id: updated.shopping_mall_product_option_id,
    value: updated.value,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
