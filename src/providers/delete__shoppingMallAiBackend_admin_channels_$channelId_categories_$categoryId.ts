import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a category in the navigation taxonomy, preserving evidence and
 * audit trail.
 *
 * This operation marks a specific channel category as deleted_at (soft delete),
 * hiding it from navigation but retaining full evidence for compliance and
 * audit. Only admins can perform this action. Deletion is disallowed if the
 * category is already deleted or does not exist.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 *   (authorization enforced by decorator)
 * @param props.channelId - Channel unique identifier (UUID) to which the
 *   category belongs
 * @param props.categoryId - Category unique identifier (UUID) to be soft
 *   deleted
 * @returns Void
 * @throws {Error} When the category does not exist or has already been deleted
 */
export async function delete__shoppingMallAiBackend_admin_channels_$channelId_categories_$categoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId, categoryId } = props;
  // Step 1: Ensure category exists and is active (not deleted)
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
    throw new Error("Category not found or already deleted");
  }
  // Step 2: Soft delete by marking deleted_at (preserving evidence)
  await MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.update({
    where: {
      id: categoryId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
