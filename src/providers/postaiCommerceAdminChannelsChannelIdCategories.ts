import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new category under a specified channel in ai_commerce_categories.
 *
 * Admin users can create new product categories for a specified sales channel.
 * This operation ensures:
 *
 * - Category code is unique within the channel (soft-deleted rows ignored)
 * - If parent_id is supplied, it exists and belongs to the same channel
 * - All business/required fields are validated and inserted
 * - All date/time fields are handled as string & tags.Format<'date-time'>
 * - All return values conform to IAiCommerceCategory, with strict null/undefined
 *   mapping for optional/nullable fields
 *
 * @param props - Object with admin authentication, the target channelId (UUID),
 *   and request body with category info
 *
 *   - Props.admin: Authenticated admin payload (must be validated by route
 *       decorator)
 *   - Props.channelId: UUID for the channel this category belongs to
 *   - Props.body: IAiCommerceCategory.ICreate with code, name, parent, status,
 *       dates, etc.
 *
 * @returns IAiCommerceCategory (newly created category, normalized, fully
 *   typed)
 * @throws {Error} If code is not unique in channel, parent_cat does not exist,
 *   or other violation
 */
export async function postaiCommerceAdminChannelsChannelIdCategories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceCategory.ICreate;
}): Promise<IAiCommerceCategory> {
  const { admin, channelId, body } = props;

  // 1. Uniqueness check: (code, ai_commerce_channel_id, deleted_at==null)
  const existing = await MyGlobal.prisma.ai_commerce_categories.findFirst({
    where: {
      ai_commerce_channel_id: channelId,
      code: body.code,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error(
      "A category with this code already exists in this channel.",
    );
  }

  // 2. Validate parent_id (if present): Must exist & be in same channel
  let parent_id: (string & tags.Format<"uuid">) | null | undefined = undefined;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.ai_commerce_categories.findFirst({
      where: {
        id: body.parent_id,
        ai_commerce_channel_id: channelId,
        deleted_at: null,
      },
    });
    if (!parent) {
      throw new Error(
        "Parent category not found or does not belong to this channel.",
      );
    }
    parent_id = body.parent_id;
  }

  // 3. Create new category
  const created = await MyGlobal.prisma.ai_commerce_categories.create({
    data: {
      id: v4(),
      ai_commerce_channel_id: channelId,
      parent_id: parent_id ?? null,
      code: body.code,
      name: body.name,
      level: body.level,
      sort_order: body.sort_order,
      is_active: body.is_active,
      business_status: body.business_status,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: null,
    },
  });

  // 4. Output normalized as IAiCommerceCategory
  return {
    id: created.id,
    ai_commerce_channel_id: created.ai_commerce_channel_id,
    parent_id: created.parent_id ?? undefined,
    code: created.code,
    name: created.name,
    level: created.level,
    sort_order: created.sort_order,
    is_active: created.is_active,
    business_status: created.business_status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
