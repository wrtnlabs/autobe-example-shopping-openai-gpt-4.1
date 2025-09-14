import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes (hard deletes) a merchandising or discovery section from
 * a sales channel by channel and section ID. This operation erases the
 * ai_commerce_sections row, ensuring only non-protected (business_status ===
 * "normal") sections can be deleted and logs the event for compliance.
 *
 * Admin-only: only system administrators may perform the deletion.
 * Protected/critical sections cannot be deleted per business rules
 * (business_status !== "normal"). Downstream Prisma relations are deleted by
 * cascade. Operation is audit logged including full before-state.
 *
 * @param props.admin The authenticated administrator performing the request.
 * @param props.channelId Unique identifier (UUID) for the parent channel.
 * @param props.sectionId Unique identifier (UUID) for the section to delete.
 * @returns Void
 * @throws {Error} If section does not exist, is already deleted, or is
 *   protected/critical by business rule.
 */
export async function deleteaiCommerceAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the section; scope to provided channel.
  const section = await MyGlobal.prisma.ai_commerce_sections.findFirst({
    where: {
      id: props.sectionId,
      ai_commerce_channel_id: props.channelId,
    },
  });
  if (!section || section.deleted_at !== null) {
    throw new Error("Section not found or already deleted");
  }
  // Enforce protection on core/critical sections;
  if (section.business_status !== "normal") {
    throw new Error(
      "Cannot delete section: protected or critical by business status",
    );
  }
  // Serialize before-state for audit
  const beforeState = JSON.stringify(section);
  // Hard delete the section (cascades downstream by Prisma model definition)
  await MyGlobal.prisma.ai_commerce_sections.delete({
    where: { id: section.id },
  });
  // Audit log
  await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
    data: {
      id: v4(),
      event_type: "DELETE_SECTION",
      actor_id: props.admin.id,
      target_table: "ai_commerce_sections",
      target_id: section.id,
      before: beforeState,
      after: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
