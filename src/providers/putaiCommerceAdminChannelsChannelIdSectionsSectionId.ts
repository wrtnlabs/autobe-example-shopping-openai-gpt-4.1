import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update channel section configuration for a given sales channel
 * (ai_commerce_sections).
 *
 * This API operation enables administrators to adjust the properties of an
 * existing section within a sales channel, including updating name, status, or
 * display order. The section to update is identified via channelId and
 * sectionId. Only allowed fields (name, is_active, business_status, sort_order)
 * may be modified. Uniqueness of section name and sort_order within the given
 * channel are enforced, and business workflow rules apply. All changes are
 * recorded with an update timestamp. Soft-deleted and missing sections are not
 * modifiable. Only authenticated admins may use this operation.
 *
 * @param props - Admin: Authenticated admin performing the update
 *   (authorization enforced at controller) channelId: UUID of the parent
 *   channel containing the section sectionId: UUID of the target section to
 *   update body: Fields to update (name, is_active, business_status,
 *   sort_order); only supplied fields are changed
 * @returns The updated section entity (IAiCommerceSection)
 * @throws {Error} If the section does not exist, is deleted, or business
 *   uniqueness rules are violated
 */
export async function putaiCommerceAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
  body: IAiCommerceSection.IUpdate;
}): Promise<IAiCommerceSection> {
  const { admin, channelId, sectionId, body } = props;

  // 1. Ensure section exists, belongs to correct channel, and is not soft-deleted
  const section = await MyGlobal.prisma.ai_commerce_sections.findFirst({
    where: {
      id: sectionId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new Error("Section not found or already deleted");
  }

  // 2. Uniqueness check: name
  if (body.name !== undefined) {
    const nameConflict = await MyGlobal.prisma.ai_commerce_sections.findFirst({
      where: {
        ai_commerce_channel_id: channelId,
        name: body.name,
        id: { not: sectionId },
        deleted_at: null,
      },
    });
    if (nameConflict) {
      throw new Error("Section name must be unique within the channel");
    }
  }
  // 3. Uniqueness check: sort_order
  if (body.sort_order !== undefined) {
    const orderConflict = await MyGlobal.prisma.ai_commerce_sections.findFirst({
      where: {
        ai_commerce_channel_id: channelId,
        sort_order: body.sort_order,
        id: { not: sectionId },
        deleted_at: null,
      },
    });
    if (orderConflict) {
      throw new Error("Sort order must be unique within the channel");
    }
  }

  // 4. Perform update (PATCH/partial)
  const updateInput = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(body.business_status !== undefined
      ? { business_status: body.business_status }
      : {}),
    ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.ai_commerce_sections.update({
    where: { id: sectionId },
    data: updateInput,
  });

  // 5. Map Prisma result to IAiCommerceSection, correct dates
  return {
    id: updated.id,
    ai_commerce_channel_id: updated.ai_commerce_channel_id,
    code: updated.code,
    name: updated.name,
    is_active: updated.is_active,
    business_status: updated.business_status,
    sort_order: updated.sort_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
