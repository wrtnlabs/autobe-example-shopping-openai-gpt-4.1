import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new article category.
 *
 * This endpoint allows an authenticated admin to create a new article category.
 * Business validation ensures:
 *
 * - The category name is unique within the channel (soft-deleted categories with
 *   the same name do not block creation)
 * - If a parent category is provided, it must exist, be in the same channel, and
 *   not be deleted
 * - All fields are written immutably and function is pure
 *
 * @param props - Props object
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - Request body with required category data (name,
 *   channel_id, order, optional parent/description)
 * @returns The newly created category, including all business/audit fields
 * @throws {Error} When the admin does not exist or is inactive
 * @throws {Error} When the category name is not unique within the channel
 * @throws {Error} When the parent category does not exist in the same channel
 *   or is deleted
 */
export async function post__shoppingMallAiBackend_admin_articleCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendArticleCategory.ICreate;
}): Promise<IShoppingMallAiBackendArticleCategory> {
  const { admin, body } = props;
  // Defensive check: Admin existence/active (redundant, but contractually required)
  const adminRec =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: { id: admin.id, is_active: true, deleted_at: null },
    });
  if (adminRec === null) throw new Error("Admin not found or not active");
  // 1. Check uniqueness of name+channel (only among not-deleted)
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
      {
        where: {
          channel_id: body.channel_id,
          name: body.name,
          deleted_at: null,
        },
      },
    );
  if (existing !== null) {
    throw new Error("Category name must be unique within the channel");
  }
  // 2. If parent_id is supplied, validate parent exists, is not deleted, in same channel
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.findFirst(
        {
          where: {
            id: body.parent_id,
            channel_id: body.channel_id,
            deleted_at: null,
          },
        },
      );
    if (!parent) {
      throw new Error("Parent category not found or not in same channel");
    }
  }
  // 3. Prepare UUID and timestamp
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  // 4. Insert
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_article_categories.create({
      data: {
        id,
        parent_id: body.parent_id ?? null,
        channel_id: body.channel_id,
        name: body.name,
        description: body.description ?? null,
        order: body.order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // 5. Return API structure
  return {
    id: created.id,
    parent_id: created.parent_id,
    channel_id: created.channel_id,
    name: created.name,
    description: created.description,
    order: created.order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
