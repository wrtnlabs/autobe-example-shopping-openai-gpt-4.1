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
  // 1. Verify referenced product exists and is not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Validate uniqueness of option name for this product (excluding soft-deleted)
  const existingOption =
    await MyGlobal.prisma.shopping_mall_product_options.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingOption) {
    throw new HttpException("Option name already exists for this product", 409);
  }
  // 3. Generate timestamps in ISO 8601 format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // 4. Create the product option
  const created = await MyGlobal.prisma.shopping_mall_product_options.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      name: props.body.name,
      required: props.body.required,
      position: props.body.position,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Return the full option object with ISO 8601 strings, deleted_at as undefined if null
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    required: created.required,
    position: created.position,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
