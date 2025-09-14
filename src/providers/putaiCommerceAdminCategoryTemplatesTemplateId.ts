import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategoryTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a category template by templateId in ai_commerce_category_templates.
 *
 * Modifies an existing category template, identified by templateId, with the
 * fields in body. Handles admin-only access, enforces is_default exclusivity,
 * validates template_data as JSON. Updates updated_at and returns the updated
 * template, using only updatable fields. Throws descriptive errors for not
 * found, invalid JSON, or business rule violation.
 *
 * @param props - Admin: AdminPayload - Authenticated admin performing the
 *   update (must be active) templateId: string & tags.Format<'uuid'> - UUID of
 *   the template to update body: IAiCommerceCategoryTemplate.IUpdate - Fields
 *   to update (name, template_data, is_default, business_status)
 * @returns IAiCommerceCategoryTemplate - Updated template full details
 * @throws {Error} If templateId does not exist
 * @throws {Error} If template_data is not valid JSON
 */
export async function putaiCommerceAdminCategoryTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
  body: IAiCommerceCategoryTemplate.IUpdate;
}): Promise<IAiCommerceCategoryTemplate> {
  const { admin, templateId, body } = props;
  // 1. Fetch template and ensure it exists & not deleted
  const template =
    await MyGlobal.prisma.ai_commerce_category_templates.findFirst({
      where: { id: templateId, deleted_at: null },
    });
  if (!template) throw new Error("Category template not found");

  // 2. Validate JSON structure if template_data present
  if (body.template_data !== undefined) {
    try {
      JSON.parse(body.template_data);
    } catch (_) {
      throw new Error("template_data must be valid JSON");
    }
  }

  // 3. Run update logic in single transaction for atomicity
  const now = toISOStringSafe(new Date());
  const [_, updated] = await MyGlobal.prisma.$transaction([
    body.is_default === true
      ? MyGlobal.prisma.ai_commerce_category_templates.updateMany({
          where: {
            is_default: true,
            deleted_at: null,
            id: { not: templateId },
          },
          data: { is_default: false },
        })
      : MyGlobal.prisma.ai_commerce_category_templates.findFirst({
          select: { id: true },
        }),
    MyGlobal.prisma.ai_commerce_category_templates.update({
      where: { id: templateId },
      data: {
        name: body.name ?? undefined,
        template_data: body.template_data ?? undefined,
        is_default: body.is_default ?? undefined,
        business_status: body.business_status ?? undefined,
        updated_at: now,
      },
    }),
  ]);

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    template_data: updated.template_data,
    is_default: updated.is_default,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
