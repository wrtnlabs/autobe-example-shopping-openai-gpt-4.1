import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates all editable fields for an existing product category specified by
 * UUID.
 *
 * This operation enables administrators to manage the taxonomy, move
 * categories, rename, or reconfigure properties as necessary. All modifications
 * are performed on the 'shopping_mall_ai_backend_product_categories' table.
 * Business validation ensures code and name uniqueness and that any
 * parent-child changes preserve the integrity of the category tree. Used for
 * catalog maintenance and audit compliance.
 *
 * @param props - The update request properties
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.categoryId - The UUID of the target product category to update
 * @param props.body - Editable fields to update (partial)
 * @returns The complete, updated product category reflecting all allowable
 *   field changes
 * @throws {Error} If the category does not exist, is deleted, uniqueness is
 *   violated, or parent is invalid
 */
export async function put__shoppingMallAiBackend_admin_productCategories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductCategory.IUpdate;
}): Promise<IShoppingMallAiBackendProductCategory> {
  const { admin, categoryId, body } = props;

  // 1. Find target category (must exist, not deleted)
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
      {
        where: {
          id: categoryId,
          deleted_at: null,
        },
      },
    );
  if (!category) throw new Error("Category not found or already deleted");

  // 2. If parent_id is supplied, verify parent exists and is not deleted (or root)
  if (body.parent_id !== undefined) {
    if (body.parent_id === null) {
      // allowed, become root
    } else {
      if (body.parent_id === categoryId)
        throw new Error("Category cannot be its own parent");
      const parent =
        await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
          {
            where: {
              id: body.parent_id,
              deleted_at: null,
            },
          },
        );
      if (!parent)
        throw new Error(
          "Specified parent category does not exist or is deleted",
        );
    }
  }

  // 3. Uniqueness: if category_code to be updated, check no duplicate
  if (body.category_code !== undefined) {
    const codeExists =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
        {
          where: {
            category_code: body.category_code,
            id: { not: categoryId },
          },
        },
      );
    if (codeExists) throw new Error("Category code must be unique");
  }
  // 3b. Uniqueness: if category_name to be updated, check no duplicate
  if (body.category_name !== undefined) {
    const nameExists =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
        {
          where: {
            category_name: body.category_name,
            id: { not: categoryId },
          },
        },
      );
    if (nameExists) throw new Error("Category name must be unique");
  }

  // 4. Perform update on supplied fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.update({
      where: { id: categoryId },
      data: {
        category_name: body.category_name ?? undefined,
        category_code: body.category_code ?? undefined,
        parent_id: body.parent_id !== undefined ? body.parent_id : undefined,
        sort_order: body.sort_order ?? undefined,
        is_active: body.is_active ?? undefined,
        category_depth: body.category_depth ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    category_name: updated.category_name,
    category_code: updated.category_code,
    parent_id: updated.parent_id ?? null,
    category_depth: updated.category_depth,
    is_active: updated.is_active,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
