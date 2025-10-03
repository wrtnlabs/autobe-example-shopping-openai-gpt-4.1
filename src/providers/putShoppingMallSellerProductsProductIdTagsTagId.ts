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

export async function putShoppingMallSellerProductsProductIdTagsTagId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
  body: IShoppingMallProductTag.IUpdate;
}): Promise<IShoppingMallProductTag> {
  // Fetch the tag, check that it belongs to productId
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findUnique({
    where: { id: props.tagId },
  });
  if (!tag || tag.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Tag not found", 404);
  }
  // Fetch the product, check that seller is the owner
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Not product owner", 403);
  }
  // Check uniqueness of tag within the product
  const duplicate = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: {
      shopping_mall_product_id: props.productId,
      tag: props.body.tag,
      id: { not: props.tagId },
    },
  });
  if (duplicate) {
    throw new HttpException("Duplicate tag for this product", 409);
  }
  // Update the tag and return
  const updated = await MyGlobal.prisma.shopping_mall_product_tags.update({
    where: { id: props.tagId },
    data: { tag: props.body.tag },
    select: { id: true, shopping_mall_product_id: true, tag: true },
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    tag: updated.tag,
  };
}
