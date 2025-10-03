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

export async function getShoppingMallSellerProductsProductIdTagsTagId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductTag> {
  // Step 1: Ensure seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { shopping_mall_seller_id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Not your product", 403);
  }
  // Step 2: Fetch tag, ensure linkage
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: { id: props.tagId, shopping_mall_product_id: props.productId },
  });
  if (!tag) throw new HttpException("Tag not found", 404);
  // Step 3: Map exact DTO
  return {
    id: tag.id,
    shopping_mall_product_id: tag.shopping_mall_product_id,
    tag: tag.tag,
  };
}
