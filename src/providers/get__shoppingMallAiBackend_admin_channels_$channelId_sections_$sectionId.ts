import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information for a specific channel section.
 *
 * Fetch the full details for a specific section within a channel. Details
 * include section code, name, description, order, hierarchical structure, and
 * configuration for business and navigation purposes. Returns all section
 * fields as defined in the Prisma schema. Only accessible to administrators.
 *
 * If the section is missing or has been soft-deleted, this function throws an
 * error. Admin authorization (presence of props.admin) is required.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin requesting the information
 * @param props.channelId - The unique ID of the parent channel
 * @param props.sectionId - The unique ID of the section to fetch
 * @returns Full section record with all configuration, display, and business
 *   details
 * @throws {Error} When the section does not exist, is not in the given channel,
 *   or has been soft-deleted (deleted_at set).
 */
export async function get__shoppingMallAiBackend_admin_channels_$channelId_sections_$sectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendChannelSection> {
  const { admin, channelId, sectionId } = props;
  const section =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst({
      where: {
        id: sectionId,
        shopping_mall_ai_backend_channel_id: channelId,
        deleted_at: null,
      },
    });
  if (!section) {
    throw new Error("Section not found");
  }
  return {
    id: section.id,
    shopping_mall_ai_backend_channel_id:
      section.shopping_mall_ai_backend_channel_id,
    parent_id: section.parent_id ?? null,
    code: section.code,
    name: section.name,
    description: section.description ?? null,
    order: section.order,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at: section.deleted_at ? toISOStringSafe(section.deleted_at) : null,
  };
}
