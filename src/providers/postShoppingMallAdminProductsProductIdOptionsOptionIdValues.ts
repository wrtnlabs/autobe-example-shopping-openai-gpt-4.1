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

export async function postShoppingMallAdminProductsProductIdOptionsOptionIdValues(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.ICreate;
}): Promise<IShoppingMallProductOptionValue> {
  const { productId, optionId, body } = props;

  // 1. Check that the option exists and belongs to the correct product
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: optionId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    },
  );
  if (!option || option.shopping_mall_product_id !== productId) {
    throw new HttpException("Product option not found for this product", 404);
  }

  // 2. Check uniqueness of value per option
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
      where: {
        shopping_mall_product_option_id: optionId,
        value: body.value,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "A value with this label already exists for this option",
      409,
    );
  }

  // 3. Create new option value
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_product_option_values.create({
      data: {
        id: v4(),
        shopping_mall_product_option_id: optionId,
        value: body.value,
        display_order: body.display_order,
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
