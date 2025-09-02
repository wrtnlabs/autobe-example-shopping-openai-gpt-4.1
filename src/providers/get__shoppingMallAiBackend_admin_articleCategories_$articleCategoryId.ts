import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full information for a specific article category by ID.
 *
 * This endpoint returns a single article category based on its globally unique
 * articleCategoryId. The result includes all category attributes such as
 * hierarchy (parent_id), channel assignment, name, description, sorting order,
 * and audit trail timestamps.
 *
 * The operation relies on the shopping_mall_ai_backend_article_categories table
 * for persistent category data. Use cases include viewing the details of a
 * selected category in a category editor UI, or gathering comprehensive
 * information for displaying a category within a navigation tree or article
 * form.
 *
 * Error handling covers not found (invalid ID), deleted categories, or access
 * errors if the user has insufficient privilege.
 *
 * @param props - Object containing admin authentication context and the article
 *   category ID.
 * @param props.admin - The authenticated admin making the request.
 * @param props.articleCategoryId - Unique identifier of the target article
 *   category.
 * @returns The detailed article category info as
 *   IShoppingMallAiBackendArticleCategory.
 * @throws {Error} When the article category does not exist, was deleted, or is
 *   not accessible.
 */
export async function get__shoppingMallAiBackend_admin_articleCategories_$articleCategoryId(props: {
  admin: AdminPayload;
  articleCategoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendArticleCategory> {
  const { articleCategoryId } = props;
  const found =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
      {
        where: {
          id: articleCategoryId,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_id: true,
          channel_id: true,
          name: true,
          description: true,
          order: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!found) throw new Error("Article category not found");

  return {
    id: found.id,
    parent_id: found.parent_id ?? null,
    channel_id: found.channel_id,
    name: found.name,
    description: found.description ?? null,
    order: found.order,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
