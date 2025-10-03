import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdContent(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductContent> {
  // 1. Fetch the product and check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }
  // 2. Fetch content
  const content = await MyGlobal.prisma.shopping_mall_product_content.findFirst(
    {
      where: { shopping_mall_product_id: props.productId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        content_markdown: true,
        return_policy: true,
        warranty_policy: true,
        locale: true,
      },
    },
  );
  if (!content) {
    throw new HttpException("Product content not found.", 404);
  }
  // 3. Return exactly as interface expects
  return {
    id: content.id,
    shopping_mall_product_id: content.shopping_mall_product_id,
    content_markdown: content.content_markdown,
    return_policy: content.return_policy,
    warranty_policy: content.warranty_policy,
    locale: content.locale,
  };
}
