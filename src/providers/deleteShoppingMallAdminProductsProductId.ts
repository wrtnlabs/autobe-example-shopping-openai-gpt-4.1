import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());

  // 1. Find the product, ensure not already soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product is already deleted", 404);
  }

  // 2. [Order/inventory check skipped: no schema relation]

  // 3. Soft delete: update deleted_at only, preserving all data
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: { deleted_at: now },
  });
}
