import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.ICreate;
}): Promise<IShoppingMallProductOption> {
  // 1. Validate product exists and is owned by seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Forbidden: You do not own this product or it does not exist.",
      403,
    );
  }
  // 2. Check for duplicate option name for the product
  const existingOption =
    await MyGlobal.prisma.shopping_mall_product_options.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingOption) {
    throw new HttpException(
      "A product option with this name already exists for the product.",
      409,
    );
  }
  // 3. Insert the new option
  const now = toISOStringSafe(new Date());
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
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    required: created.required,
    position: created.position,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
