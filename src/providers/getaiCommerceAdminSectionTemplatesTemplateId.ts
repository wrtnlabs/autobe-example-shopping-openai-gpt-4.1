import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve full details of a specific section template from
 * ai_commerce_section_templates.
 *
 * This endpoint allows admins to fetch detailed configuration, status, and
 * metadata for a single section template identified by templateId. Used for
 * previewing or editing channel merchandising templates. Only non-deleted
 * templates are accessible.
 *
 * @param props - Properties containing the admin credential and the unique
 *   templateId to retrieve.
 * @param props.admin - Authenticated admin user payload (authorization enforced
 *   before call)
 * @param props.templateId - UUID identifying the section template to fetch
 * @returns IAiCommerceSectionTemplate object with all schema fields populated
 * @throws {Error} If the section template is not found or is deleted
 */
export async function getaiCommerceAdminSectionTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSectionTemplate> {
  const { templateId } = props;

  const template =
    await MyGlobal.prisma.ai_commerce_section_templates.findFirst({
      where: {
        id: templateId,
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        template_data: true,
        is_default: true,
        business_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!template) {
    throw new Error("Section template not found");
  }

  return {
    id: template.id,
    code: template.code,
    name: template.name,
    template_data: template.template_data,
    is_default: template.is_default,
    business_status: template.business_status,
    created_at: toISOStringSafe(template.created_at),
    updated_at: toISOStringSafe(template.updated_at),
    deleted_at:
      template.deleted_at !== null && template.deleted_at !== undefined
        ? toISOStringSafe(template.deleted_at)
        : null,
  };
}
