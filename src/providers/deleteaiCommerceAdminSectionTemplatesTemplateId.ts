import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Remove a section template (soft delete) by template ID from
 * ai_commerce_section_templates.
 *
 * This operation soft deletes the specified section template by setting its
 * deleted_at timestamp, in compliance with audit and rollback requirements.
 * Only administrators may perform this operation. Attempts to delete an already
 * deleted or non-existent template will throw an error. No delete is performed
 * if template is not found or is already soft deleted. If future relationships
 * exist that require reference constraint checks, those should be added here.
 *
 * @param props - Object containing required properties
 * @param props.admin - The authenticated administrator performing the delete
 *   (authorization handled by decorator)
 * @param props.templateId - The UUID of the section template to soft delete
 * @returns Void
 * @throws {Error} When the template does not exist or is already deleted
 */
export async function deleteaiCommerceAdminSectionTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, templateId } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const existing =
    await MyGlobal.prisma.ai_commerce_section_templates.findFirst({
      where: { id: templateId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Section template not found or already deleted");
  }

  await MyGlobal.prisma.ai_commerce_section_templates.update({
    where: { id: templateId },
    data: { deleted_at: now },
  });
}
