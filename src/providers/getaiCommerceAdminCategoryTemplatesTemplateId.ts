import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategoryTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a specific category template from
 * ai_commerce_category_templates.
 *
 * Fetches the complete detail and configuration data for a category template
 * referenced by templateId, including business rules, JSON-encoded hierarchical
 * structure, approval status, and timestamps from
 * ai_commerce_category_templates.
 *
 * This endpoint enables administrator roles to view and verify a category
 * template before applying, editing, or deleting, supporting business rule
 * enforcement, change review, and audit workflows for category organization.
 *
 * Authorization: Only admin users may access this resource. Throws if the
 * template does not exist or is soft-deleted.
 *
 * @param props - Object containing admin authentication and templateId path
 *   parameter
 * @param props.admin - The authenticated system administrator payload
 * @param props.templateId - The UUID of the category template to retrieve
 * @returns The detailed IAiCommerceCategoryTemplate object matching the id
 * @throws {Error} If the category template does not exist or is soft-deleted.
 */
export async function getaiCommerceAdminCategoryTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceCategoryTemplate> {
  const { templateId } = props;
  // Find category template by id, exclude soft-deleted records
  const template =
    await MyGlobal.prisma.ai_commerce_category_templates.findFirst({
      where: { id: templateId, deleted_at: null },
    });
  if (!template) {
    throw new Error("Category template not found");
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
    // IAiCommerceCategoryTemplate.deleted_at?: (string & tags.Format<'date-time'>) | null | undefined
    deleted_at:
      template.deleted_at === null || template.deleted_at === undefined
        ? null
        : toISOStringSafe(template.deleted_at),
  };
}
