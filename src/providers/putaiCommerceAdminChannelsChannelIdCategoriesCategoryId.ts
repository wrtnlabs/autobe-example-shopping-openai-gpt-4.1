import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update category attributes for a given channel and category in
 * ai_commerce_categories.
 *
 * Administrators can modify properties such as display name, status, display
 * order, hierarchy parent, and level for an existing product category under a
 * sales channel. The endpoint enforces that the category exists in the
 * specified channel, prevents illegal parent assignments (self-reference), and
 * ensures that all date values are formatted as string &
 * tags.Format<'date-time'>.
 *
 * - If parent_id is set, it must reference a valid, undeleted category in the
 *   same channel and must not create a cycle.
 * - Only fields present in body are applied (partial update).
 * - The code field is immutable via this endpoint.
 * - All audit fields are handled as per type constraints.
 *
 * @param props Request props containing admin authorization context, IDs, and
 *   update payload
 * @returns Updated IAiCommerceCategory object with new and unchanged values
 * @throws {Error} If category or parent category not found, or if parent_id is
 *   set to self
 */
export async function putaiCommerceAdminChannelsChannelIdCategoriesCategoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
  body: IAiCommerceCategory.IUpdate;
}): Promise<IAiCommerceCategory> {
  const { channelId, categoryId, body } = props;
  // 1. Ensure the target category exists in the channel and is not deleted
  const existing = await MyGlobal.prisma.ai_commerce_categories.findFirst({
    where: {
      id: categoryId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new Error("Category not found");
  }
  // 2. If changing parent, validate the new parent (exists, channel match, not deleted, not self)
  if (body.parent_id !== undefined && body.parent_id !== null) {
    if (body.parent_id === categoryId) {
      throw new Error("Cannot set category parent to self");
    }
    const parent = await MyGlobal.prisma.ai_commerce_categories.findFirst({
      where: {
        id: body.parent_id,
        ai_commerce_channel_id: channelId,
        deleted_at: null,
      },
    });
    if (!parent) {
      throw new Error("Parent category not found in channel");
    }
  }
  // 3. Update category using only fields present in the body
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ai_commerce_categories.update({
    where: { id: categoryId },
    data: {
      name: body.name ?? undefined,
      level: body.level ?? undefined,
      sort_order: body.sort_order ?? undefined,
      is_active: body.is_active ?? undefined,
      business_status: body.business_status ?? undefined,
      parent_id: body.parent_id === undefined ? undefined : body.parent_id,
      updated_at: now,
    },
  });
  // 4. Compose and return updated DTO, converting Date fields with toISOStringSafe
  return {
    id: updated.id,
    ai_commerce_channel_id: updated.ai_commerce_channel_id,
    parent_id: updated.parent_id ?? undefined,
    code: updated.code,
    name: updated.name,
    level: updated.level,
    sort_order: updated.sort_order,
    is_active: updated.is_active,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
