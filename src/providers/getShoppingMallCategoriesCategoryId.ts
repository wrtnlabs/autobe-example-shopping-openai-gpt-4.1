import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategory> {
  const { categoryId } = props;
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  return {
    id: category.id,
    parent_id: category.parent_id === null ? undefined : category.parent_id,
    name_ko: category.name_ko,
    name_en: category.name_en,
    description_ko:
      category.description_ko === null ? undefined : category.description_ko,
    description_en:
      category.description_en === null ? undefined : category.description_en,
    display_order: category.display_order,
    is_active: category.is_active,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at === null
        ? undefined
        : toISOStringSafe(category.deleted_at),
  };
}
