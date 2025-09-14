import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new section template in ai_commerce_section_templates.
 *
 * Enables admin users to define and register a new section template for use in
 * business merchandising, channel planning, or AI configuration. The
 * ai_commerce_section_templates model captures template code, name,
 * template_data, is_default, business_status, and auto-generated metadata.
 * Uniqueness for template code is enforced. On success, returns the template as
 * an IAiCommerceSectionTemplate object for workflow and UI usage.
 *
 * Authorization: Only admins (validated via props.admin) may call this
 * endpoint.
 *
 * @param props - Operation arguments
 * @param props.admin - The authenticated admin payload making this request
 * @param props.body - Section template creation fields: code, name,
 *   template_data, is_default, business_status
 * @returns The created section template object
 * @throws {Error} When a section template with the same code already exists
 *   (unique constraint)
 */
export async function postaiCommerceAdminSectionTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceSectionTemplate.ICreate;
}): Promise<IAiCommerceSectionTemplate> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  try {
    const created = await MyGlobal.prisma.ai_commerce_section_templates.create({
      data: {
        id,
        code: props.body.code,
        name: props.body.name,
        template_data: props.body.template_data,
        is_default: props.body.is_default,
        business_status: props.body.business_status,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      template_data: created.template_data,
      is_default: created.is_default,
      business_status: created.business_status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null || created.deleted_at === undefined
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002" &&
      Array.isArray((err as any)?.meta?.target) &&
      (err as any).meta.target.includes("code")
    ) {
      throw new Error("Section template code already exists");
    }
    throw err;
  }
}
