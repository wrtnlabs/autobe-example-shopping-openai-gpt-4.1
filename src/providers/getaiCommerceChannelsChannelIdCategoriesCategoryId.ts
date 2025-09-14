import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";

/**
 * Retrieve detailed information about a specific channel category from
 * ai_commerce_categories.
 *
 * This operation retrieves a single category entry scoped to a given channel,
 * identified by both channelId and categoryId. It outputs complete category
 * detail including hierarchical data, status, audit timestamps, and
 * soft-deletion handling.
 *
 * No authentication is required (public, read-only). Error thrown if not found
 * or soft-deleted.
 *
 * @param props.channelId - UUID of the parent sales channel
 * @param props.categoryId - UUID of the target category
 * @returns IAiCommerceCategory with full detail
 * @throws {Error} When the category does not exist or is soft-deleted
 */
export async function getaiCommerceChannelsChannelIdCategoriesCategoryId(props: {
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCategory> {
  const { channelId, categoryId } = props;
  const result = await MyGlobal.prisma.ai_commerce_categories.findFirst({
    where: {
      id: categoryId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!result) throw new Error("Category not found");

  return {
    id: result.id,
    ai_commerce_channel_id: result.ai_commerce_channel_id,
    parent_id: result.parent_id ?? undefined,
    code: result.code,
    name: result.name,
    level: result.level,
    sort_order: result.sort_order,
    is_active: result.is_active,
    business_status: result.business_status,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at !== null && result.deleted_at !== undefined
        ? toISOStringSafe(result.deleted_at)
        : undefined,
  };
}
