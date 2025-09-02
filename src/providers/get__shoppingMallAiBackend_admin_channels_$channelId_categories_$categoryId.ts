import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full details of a channel category for edit, review, or analytics.
 *
 * This operation retrieves all business, identification, and audit fields for a
 * single category within a sales channel. The result includes all key
 * navigation, taxonomy, and compliance attributes appropriate for admin
 * view/edit flows, analytics, and integrations. Soft-deleted categories are
 * never returned. Requires admin authentication; access to category details is
 * restricted to authorized platform admins.
 *
 * @param props - Admin: The authenticated admin user performing the operation.
 *   Presence is required for permission; only admins may access this API.
 *   channelId: UUID of the sales channel scoping the desired category (must
 *   match category's channel). categoryId: UUID of the specific channel
 *   category to be retrieved (primary key).
 * @returns Complete category details object (all attributes, navigation,
 *   status, audit fields) suitable for display/edit, analytics, or
 *   integration.
 * @throws {Error} If the category does not exist, is soft-deleted, or does not
 *   belong to the specified channelId.
 */
export async function get__shoppingMallAiBackend_admin_channels_$channelId_categories_$categoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendChannelCategory> {
  const { admin, channelId, categoryId } = props;

  // Admin authorization is guaranteed by decorator (admin field type)
  // Fetch category by id, channel, soft delete check
  const category =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findFirst(
      {
        where: {
          id: categoryId,
          shopping_mall_ai_backend_channel_id: channelId,
          deleted_at: null,
        },
      },
    );
  if (!category) {
    throw new Error("Channel category not found");
  }

  return {
    id: category.id,
    shopping_mall_ai_backend_channel_id:
      category.shopping_mall_ai_backend_channel_id,
    parent_id: category.parent_id ?? null,
    code: category.code,
    name: category.name,
    description: category.description ?? null,
    order: category.order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
