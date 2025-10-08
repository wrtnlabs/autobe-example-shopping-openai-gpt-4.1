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

export async function postShoppingMallAdminProductsProductIdOptions(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.ICreate;
}): Promise<IShoppingMallProductOption> {
  // Verify product existence
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });

  // Enforce uniqueness constraint for (product_id + name)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_options.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Duplicate product option name for this product.",
      409,
    );
  }

  // Create the product option
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_options.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      name: props.body.name,
      display_order: props.body.display_order,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
