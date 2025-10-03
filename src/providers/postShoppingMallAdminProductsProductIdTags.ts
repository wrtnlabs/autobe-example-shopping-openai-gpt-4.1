import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdTags(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.ICreate;
}): Promise<IShoppingMallProductTag> {
  // 1. Verify product exists
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Check for duplicate tag on this product
  const duplicate = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: { shopping_mall_product_id: props.productId, tag: props.body.tag },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpException("This tag already exists for this product", 409);
  }

  // 3. Insert row
  const created = await MyGlobal.prisma.shopping_mall_product_tags.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      tag: props.body.tag,
    },
    select: { id: true, shopping_mall_product_id: true, tag: true },
  });
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    tag: created.tag,
  };
}
