import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdTags(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.ICreate;
}): Promise<IShoppingMallProductTag> {
  // 1. Get product and check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  // 2. Check for duplicate tag
  const duplicate = await MyGlobal.prisma.shopping_mall_product_tags.findUnique(
    {
      where: {
        shopping_mall_product_id_tag: {
          shopping_mall_product_id: props.productId,
          tag: props.body.tag,
        },
      },
      select: { id: true },
    },
  );
  if (duplicate) {
    throw new HttpException("Duplicate tag for product", 409);
  }

  // 3. Insert tag
  const created = await MyGlobal.prisma.shopping_mall_product_tags.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      tag: props.body.tag,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
      tag: true,
    },
  });

  // 4. Return result matching IShoppingMallProductTag, all fields required
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    tag: created.tag,
  };
}
