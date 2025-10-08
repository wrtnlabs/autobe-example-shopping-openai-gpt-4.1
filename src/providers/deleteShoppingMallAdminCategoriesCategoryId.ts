import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch category and ensure it exists & is not already deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.categoryId },
  });
  if (!category || category.deleted_at !== null) {
    throw new HttpException("Category not found or already deleted.", 404);
  }

  // 2. Check for existing active child categories
  const childExists = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: { parent_id: props.categoryId, deleted_at: null },
    select: { id: true },
  });
  if (childExists) {
    throw new HttpException(
      "Cannot delete: category has active child categories. Remove or reassign them first.",
      400,
    );
  }

  // 3. Check for existing active products
  const productExists = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { shopping_mall_category_id: props.categoryId, deleted_at: null },
    select: { id: true },
  });
  if (productExists) {
    throw new HttpException(
      "Cannot delete: category has active products. Remove or reassign them first.",
      400,
    );
  }

  // 4. Soft-delete the category by setting deleted_at
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // No return needed (void)
}
