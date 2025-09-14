import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing section template in ai_commerce_section_templates.
 *
 * This API endpoint allows an authenticated admin to update fields on an
 * existing section template, such as name, template_data, is_default, and
 * business_status. The updated_at timestamp is always refreshed to indicate
 * modification. Attempts to update a section template that does not exist or is
 * already deleted will result in an error.
 *
 * @param props - The input object containing:
 *
 *   - Admin: The authenticated admin payload (authorization enforced upstream)
 *   - TemplateId: The ID of the section template to update (UUID)
 *   - Body: The update payload (fields to modify)
 *
 * @returns The updated IAiCommerceSectionTemplate entity
 * @throws {Error} If the section template doesn't exist or has been deleted
 */
export async function putaiCommerceAdminSectionTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
  body: IAiCommerceSectionTemplate.IUpdate;
}): Promise<IAiCommerceSectionTemplate> {
  const { templateId, body } = props;

  // Ensure the section template exists and is active (not deleted)
  const existing =
    await MyGlobal.prisma.ai_commerce_section_templates.findFirst({
      where: {
        id: templateId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Section template not found");
  }

  // Prepare the update fields (only allowed)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.ai_commerce_section_templates.update({
    where: { id: templateId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.template_data !== undefined
        ? { template_data: body.template_data }
        : {}),
      ...(body.is_default !== undefined ? { is_default: body.is_default } : {}),
      ...(body.business_status !== undefined
        ? { business_status: body.business_status }
        : {}),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    template_data: updated.template_data,
    is_default: updated.is_default,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
