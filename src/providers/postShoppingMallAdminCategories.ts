import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  const { body } = props;
  // If parent_id is provided, ensure the parent category exists and is not deleted
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parentCategory =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: body.parent_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!parentCategory) {
      throw new HttpException(
        "Parent category does not exist or is deleted.",
        400,
      );
    }
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());
  // Insert the new category
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_categories.create({
      data: {
        id: v4(),
        parent_id: body.parent_id ?? null,
        name_ko: body.name_ko,
        name_en: body.name_en,
        description_ko: body.description_ko ?? null,
        description_en: body.description_en ?? null,
        display_order: body.display_order,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (error) {
    // Handle unique constraint violation for parent_id+name_ko or parent_id+name_en
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate category name detected in the same parent (Korean or English).",
        400,
      );
    }
    throw new HttpException("Failed to create category.", 500);
  }

  return {
    id: created.id,
    parent_id: created.parent_id ?? undefined,
    name_ko: created.name_ko,
    name_en: created.name_en,
    description_ko: created.description_ko ?? undefined,
    description_en: created.description_en ?? undefined,
    display_order: created.display_order,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
