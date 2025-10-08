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

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const { admin, categoryId, body } = props;

  // 1. Fetch category, error if not found or deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.deleted_at) {
    throw new HttpException("Category not found", 404);
  }

  // 2. Validate parent (if changing parent_id)
  if ("parent_id" in body) {
    if (body.parent_id === categoryId) {
      throw new HttpException("Cannot set category's parent to itself", 400);
    }
    if (body.parent_id) {
      let curr = body.parent_id;
      while (curr) {
        if (curr === categoryId) {
          throw new HttpException("Category parent loop detected", 400);
        }
        const parent =
          await MyGlobal.prisma.shopping_mall_categories.findUnique({
            where: { id: curr },
          });
        if (!parent) {
          throw new HttpException("Parent category does not exist", 400);
        }
        if (parent.parent_id === null || parent.parent_id === undefined) {
          break;
        }
        curr = parent.parent_id satisfies string as string;
      }
    }
  }

  // 3. Validate uniqueness: name_ko and name_en under selected parent_id
  const parent_id =
    "parent_id" in body ? (body.parent_id ?? null) : category.parent_id;
  const name_ko = "name_ko" in body ? body.name_ko : category.name_ko;
  const name_en = "name_en" in body ? body.name_en : category.name_en;
  {
    const conflictKo = await MyGlobal.prisma.shopping_mall_categories.findFirst(
      {
        where: {
          id: { not: categoryId },
          parent_id: parent_id,
          name_ko: name_ko,
          deleted_at: null,
        },
      },
    );
    if (conflictKo) {
      throw new HttpException("Duplicate name_ko in parent category", 409);
    }
    const conflictEn = await MyGlobal.prisma.shopping_mall_categories.findFirst(
      {
        where: {
          id: { not: categoryId },
          parent_id: parent_id,
          name_en: name_en,
          deleted_at: null,
        },
      },
    );
    if (conflictEn) {
      throw new HttpException("Duplicate name_en in parent category", 409);
    }
  }

  // 4. Update main category
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: categoryId },
    data: {
      parent_id: "parent_id" in body ? (body.parent_id ?? null) : undefined,
      name_ko: "name_ko" in body ? body.name_ko : undefined,
      name_en: "name_en" in body ? body.name_en : undefined,
      description_ko:
        "description_ko" in body ? (body.description_ko ?? null) : undefined,
      description_en:
        "description_en" in body ? (body.description_en ?? null) : undefined,
      display_order: "display_order" in body ? body.display_order : undefined,
      is_active: "is_active" in body ? body.is_active : undefined,
      updated_at: now,
    },
  });

  // 5. If inactivating, recursively inactivate all descendants
  if (
    "is_active" in body &&
    body.is_active === false &&
    category.is_active === true
  ) {
    let queue = [updated.id];
    while (queue.length > 0) {
      const children = await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { parent_id: queue[0], deleted_at: null },
        select: { id: true, is_active: true },
      });
      const toDisable = children.filter((x) => x.is_active).map((x) => x.id);
      if (toDisable.length > 0) {
        await MyGlobal.prisma.shopping_mall_categories.updateMany({
          where: { id: { in: toDisable } },
          data: { is_active: false, updated_at: now },
        });
      }
      queue.push(...children.map((x) => x.id));
      queue.shift();
    }
  }

  return {
    id: updated.id,
    parent_id: updated.parent_id ?? undefined,
    name_ko: updated.name_ko,
    name_en: updated.name_en,
    description_ko: updated.description_ko ?? undefined,
    description_en: updated.description_en ?? undefined,
    display_order: updated.display_order,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
