import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdContent(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductContent> {
  // Step 1: Check that the product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });

  // Step 2: Find content for the productId
  const content = await MyGlobal.prisma.shopping_mall_product_content.findFirst(
    {
      where: { shopping_mall_product_id: props.productId },
    },
  );

  if (!content) {
    throw new HttpException("Product content not found", 404);
  }

  return {
    id: content.id,
    shopping_mall_product_id: content.shopping_mall_product_id,
    content_markdown: content.content_markdown,
    return_policy: content.return_policy,
    warranty_policy: content.warranty_policy,
    locale: content.locale,
  };
}
