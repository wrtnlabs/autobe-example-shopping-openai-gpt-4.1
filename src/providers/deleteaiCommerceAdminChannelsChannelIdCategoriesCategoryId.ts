import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes (hard delete) a product category from a channel.
 *
 * This operation verifies the target category exists, belongs to the target
 * channel, and is not soft-deleted. It blocks deletion if any non-deleted child
 * categories remain or if any products are assigned to this category. Upon
 * passing these checks, the category row is permanently removed (hard delete)
 * from the database.
 *
 * Authorization: Only accessible to authenticated administrators (admin payload
 * verified via controller guard).
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.channelId - The UUID of the parent sales channel
 * @param props.categoryId - The UUID of the category to be deleted
 * @returns Promise<void> Resolves on successful removal
 * @throws {Error} When the category does not exist, is already deleted, has
 *   child categories, or has assigned products
 */
export async function deleteaiCommerceAdminChannelsChannelIdCategoriesCategoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId, categoryId } = props;

  // Step 1: Verify the target category exists, belongs to the channel, and is not soft-deleted
  const category = await MyGlobal.prisma.ai_commerce_categories.findFirst({
    where: {
      id: categoryId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new Error(
      "Category not found, not in specified channel, or has been deleted.",
    );
  }

  // Step 2: Check for existing child categories (not soft-deleted)
  const childExists = await MyGlobal.prisma.ai_commerce_categories.findFirst({
    where: {
      parent_id: categoryId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (childExists) {
    throw new Error(
      "Cannot delete: category has child categories. Remove or reassign them first.",
    );
  }

  // Step 3: Check for product assignments to this category
  const productBindingExists =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: {
        category_id: categoryId,
      },
      select: { id: true },
    });
  if (productBindingExists) {
    throw new Error(
      "Cannot delete: category is assigned to products. Remove product associations first.",
    );
  }

  // Step 4: Hard delete the category record
  await MyGlobal.prisma.ai_commerce_categories.delete({
    where: { id: categoryId },
  });
}
