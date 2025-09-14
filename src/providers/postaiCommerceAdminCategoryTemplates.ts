import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategoryTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new category template in ai_commerce_category_templates.
 *
 * This endpoint enables platform administrators to formalize reusable category
 * hierarchies, supporting standardized onboarding and large-scale
 * merchandising, analytics, and AI modules. It requires an admin authentication
 * and validates unique code constraint, serial structure, and compliance with
 * business rules. On success, a new template with audit fields is created.
 *
 * @param props - Properties containing the authenticated admin payload and
 *   creation body
 * @param props.admin - The authenticated administrator performing the operation
 * @param props.body - The creation data for the new category template
 * @returns The fully created category template, including all audit and
 *   configuration fields
 * @throws {Error} If a template with the given code already exists
 */
export async function postaiCommerceAdminCategoryTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceCategoryTemplate.ICreate;
}): Promise<IAiCommerceCategoryTemplate> {
  const { body } = props;

  // Ensure code is unique
  const exists = await MyGlobal.prisma.ai_commerce_category_templates.findFirst(
    {
      where: { code: body.code },
    },
  );
  if (exists) {
    throw new Error(
      `A category template with code '[1m${body.code}[22m' already exists. Please choose a unique code.`,
    );
  }

  const id = v4();
  const now = toISOStringSafe(new Date());
  const isDefault =
    typeof body.is_default === "boolean" ? body.is_default : false;

  const created = await MyGlobal.prisma.ai_commerce_category_templates.create({
    data: {
      id: id,
      code: body.code,
      name: body.name,
      template_data: body.template_data,
      is_default: isDefault,
      business_status: body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
