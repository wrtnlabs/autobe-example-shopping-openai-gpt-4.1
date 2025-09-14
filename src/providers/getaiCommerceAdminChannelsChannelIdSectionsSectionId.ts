import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full details of a single channel section within a given sales
 * channel (ai_commerce_sections).
 *
 * This API operation fetches details for a specific section within a given
 * channel, identified by its unique sectionId and channelId. The response
 * includes all key properties (code, name, operational status, business_status,
 * sort_order, etc.) as defined by the ai_commerce_sections model.
 *
 * Access control ensures that only administrators or privileged channel
 * managers can view sensitive business configuration and status details. The
 * endpoint supports audit and compliance checks—returning only the latest
 * (non-deleted) state. Error handling includes visibility of not found,
 * deleted, or inaccessible results, supporting secure management dashboards or
 * integration pipelines.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated administrator making the request
 * @param props.channelId - Unique identifier for the sales channel
 * @param props.sectionId - Unique identifier for the channel section
 * @returns The detailed section entity from ai_commerce_sections
 * @throws {Error} If the section does not exist, is deleted, or the admin is
 *   unauthorized
 */
export async function getaiCommerceAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSection> {
  const { channelId, sectionId } = props;
  const section = await MyGlobal.prisma.ai_commerce_sections.findFirst({
    where: {
      id: sectionId,
      ai_commerce_channel_id: channelId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new Error("Section not found");
  }
  return {
    id: section.id,
    ai_commerce_channel_id: section.ai_commerce_channel_id,
    code: section.code,
    name: section.name,
    is_active: section.is_active,
    business_status: section.business_status,
    sort_order: section.sort_order,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at:
      section.deleted_at === null || section.deleted_at === undefined
        ? null
        : toISOStringSafe(section.deleted_at),
  };
}
