import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdOptionsOptionId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IUpdate;
}): Promise<IShoppingMallProductOption> {
  const now = toISOStringSafe(new Date());
  // 1. Find target option and check productId match
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: props.optionId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!option)
    throw new HttpException(
      "Option not found for product or already deleted",
      404,
    );

  // 2. If updating name, check uniqueness within same product
  if (
    props.body.name !== undefined &&
    props.body.name !== null &&
    props.body.name !== option.name
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_product_options.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          name: props.body.name,
          id: { not: props.optionId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (duplicate) {
      throw new HttpException(
        "Another option with this name exists for this product",
        409,
      );
    }
  }

  // 3. Build update fields immutably
  await MyGlobal.prisma.shopping_mall_product_options.update({
    where: { id: props.optionId },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.required !== undefined
        ? { required: props.body.required }
        : {}),
      ...(props.body.position !== undefined
        ? { position: props.body.position }
        : {}),
      updated_at: now,
    },
  });

  // 4. Re-fetch updated option
  const updated =
    await MyGlobal.prisma.shopping_mall_product_options.findUniqueOrThrow({
      where: { id: props.optionId },
    });

  // 5. Return object per DTO (convert dates, preserve types, do not use 'as')
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    name: updated.name,
    required: updated.required,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
