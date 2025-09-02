import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about a specific product category identified
 * by its UUID.
 *
 * This read-only operation fetches all business-relevant fields for a single
 * product category from the 'shopping_mall_ai_backend_product_categories'
 * table, excluding soft-deleted rows. Only accessible to authenticated admins.
 * Used for editing, displaying, or auditing category metadata.
 *
 * @param props - Request parameter object
 * @param props.admin - The authenticated admin account (authorization enforced
 *   upstream)
 * @param props.categoryId - The unique identifier (UUID) of the product
 *   category to retrieve
 * @returns Product category record including all primary business and audit
 *   fields (dates as ISO8601 strings)
 * @throws {Error} When the category does not exist or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_productCategories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductCategory> {
  const { categoryId } = props;
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_categories.findFirst(
      {
        where: {
          id: categoryId,
          deleted_at: null,
        },
      },
    );
  if (category == null)
    throw new Error("Product category not found or deleted");
  return {
    id: category.id,
    category_name: category.category_name,
    category_code: category.category_code,
    parent_id: category.parent_id ?? null,
    category_depth: category.category_depth,
    is_active: category.is_active,
    sort_order: category.sort_order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
