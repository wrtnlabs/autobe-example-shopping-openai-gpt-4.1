import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new product category for organizing products in the shopping mall
 * backend.
 *
 * This operation targets the 'shopping_mall_ai_backend_product_categories'
 * table and allows authorized users to define the hierarchical structure, code,
 * display name, activation state, and sort priority of the category. Used by
 * administrators or seller managers when expanding or reorganizing product
 * catalogs, this endpoint enforces uniqueness and business validation for
 * category code and name. New category is immediately available for assignment
 * to products after creation.
 *
 * Authorization: Restricted to admins (enforced by AdminAuth).
 *
 * @param props - The request properties
 * @param props.admin - The authenticated admin user creating the category
 * @param props.body - The category creation data, including name, code, parent,
 *   etc.
 * @returns The newly created product category record
 * @throws {Error} If the category code already exists, or the provided parent
 *   category does not exist
 */
export async function post__shoppingMallAiBackend_admin_productCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendProductCategory.ICreate;
}): Promise<IShoppingMallAiBackendProductCategory> {
  const { admin, body } = props;

  // Uniqueness check for category_code
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
      {
        where: { category_code: body.category_code },
      },
    );
  if (duplicate) {
    throw new Error("Duplicate category_code: This code already exists");
  }

  // Determine category depth
  let category_depth: number & tags.Type<"int32"> = 0;
  let parent_id: (string & tags.Format<"uuid">) | null = null;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findUnique(
        {
          where: { id: body.parent_id },
        },
      );
    if (!parent) {
      throw new Error("Parent category not found");
    }
    parent_id = body.parent_id;
    category_depth = (parent.category_depth + 1) as number & tags.Type<"int32">;
  }

  const now = toISOStringSafe(new Date());
  // Prepare all fields as required by schema
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.create({
      data: {
        id: v4(),
        category_name: body.category_name,
        category_code: body.category_code,
        parent_id: parent_id,
        category_depth:
          body.category_depth !== undefined
            ? body.category_depth
            : category_depth,
        is_active: body.is_active !== undefined ? body.is_active : true,
        sort_order: body.sort_order !== undefined ? body.sort_order : 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    category_name: created.category_name,
    category_code: created.category_code,
    parent_id: created.parent_id ?? null,
    category_depth: created.category_depth,
    is_active: created.is_active,
    sort_order: created.sort_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
