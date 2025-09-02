import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing article category by its unique identifier.
 *
 * This operation lets an admin modify fields such as the category's name,
 * description, sort order, or parent for hierarchy restructuring, provided the
 * category exists and all business rules are enforced:
 *
 * - Category name must be unique within the same channel.
 * - Parent (if provided) must exist, not be self, be in the same channel, and not
 *   create a cycle.
 *
 * Audit fields (updated_at) are automatically refreshed. Requires admin
 * authentication and proper permissions.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload performing the update
 * @param props.articleCategoryId - Unique identifier (UUID) of the article
 *   category to update
 * @param props.body - Fields for updating category: name, parent_id, order, or
 *   description (all optional)
 * @returns The updated article category in detailed DTO form
 * @throws {Error} If the category does not exist, is deleted, violates
 *   uniqueness/hierarchy business rules, or if parent is invalid
 */
export async function put__shoppingMallAiBackend_admin_articleCategories_$articleCategoryId(props: {
  admin: AdminPayload;
  articleCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendArticleCategory.IUpdate;
}): Promise<IShoppingMallAiBackendArticleCategory> {
  const { admin, articleCategoryId, body } = props;

  // Fetch the original category (not soft-deleted)
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
      {
        where: {
          id: articleCategoryId,
          deleted_at: null,
        },
      },
    );
  if (!category) throw new Error("Category not found or already deleted");

  // Enforce name uniqueness within channel if modifying name
  if (body.name !== undefined && body.name !== category.name) {
    const exists =
      await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
        {
          where: {
            channel_id: category.channel_id,
            name: body.name,
            id: { not: articleCategoryId },
            deleted_at: null,
          },
        },
      );
    if (exists)
      throw new Error("Category name must be unique within the channel");
  }

  // Validate parent_id change (if provided)
  let targetParentId =
    body.parent_id !== undefined ? body.parent_id : category.parent_id;
  if (body.parent_id !== undefined) {
    // Cannot set self as parent
    if (targetParentId === category.id) {
      throw new Error("A category cannot be its own parent");
    }
    // If new parent is non-null, validate existence, same channel, and no cycles
    if (targetParentId) {
      const parent =
        await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
          {
            where: {
              id: targetParentId,
              channel_id: category.channel_id,
              deleted_at: null,
            },
          },
        );
      if (!parent)
        throw new Error(
          "Parent category not found, deleted, not in the same channel, or invalid",
        );

      // Check for cycles: walk up ancestor chain; if encounter this category id, cycle exists
      let ancestorId = parent.parent_id;
      while (ancestorId) {
        if (ancestorId === category.id) {
          throw new Error("Hierarchy cycle: cannot set a descendant as parent");
        }
        const ancestor =
          await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
            {
              where: { id: ancestorId, deleted_at: null },
            },
          );
        ancestorId = ancestor ? ancestor.parent_id : null;
      }
    }
  }

  // Prepare updated_at value now
  const now = toISOStringSafe(new Date());

  // Update only provided fields (patch semantics); always update updated_at
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.update({
      where: { id: category.id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        parent_id: body.parent_id !== undefined ? body.parent_id : undefined,
        order: body.order ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    parent_id: updated.parent_id ?? null,
    channel_id: updated.channel_id,
    name: updated.name,
    description: updated.description ?? null,
    order: updated.order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
