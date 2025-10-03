import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdTagsTagId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure product exists, owned by this seller, and not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      seller: {
        shopping_mall_customer_id: props.seller.id,
        deleted_at: null,
      },
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // 2. Check that the tag exists and is linked to this product
  const tag = await MyGlobal.prisma.shopping_mall_product_tags.findFirst({
    where: {
      id: props.tagId,
      shopping_mall_product_id: props.productId,
    },
  });
  if (!tag) {
    throw new HttpException("Tag not found for this product", 404);
  }

  // 3. Delete tag (hard delete)
  await MyGlobal.prisma.shopping_mall_product_tags.delete({
    where: {
      id: props.tagId,
    },
  });

  // 4. No return value
}
