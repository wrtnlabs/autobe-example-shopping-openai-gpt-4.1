import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBusinessRuleTemplates } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplates";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new business rule template (ai_commerce_business_rule_templates).
 *
 * This function allows administrators to create a new business rule template
 * capturing all configuration, workflow, or promotional logic as a modular,
 * versioned record. Templates are versioned and uniquely identified by the code
 * and version combination. All required fields are persisted, with strict
 * security restricting creation to administrators only. Soft deletion is
 * supported via the nullable deleted_at field.
 *
 * Security: Only authenticated admins (AdminPayload) can create new rule
 * templates. Attempts to create a duplicate (code, version) combination throw
 * an error.
 *
 * @param props - Object with admin authentication and the template creation
 *   payload.
 * @param props.admin - Authenticated admin creating the rule template.
 * @param props.body - Business rule template creation fields: code, name,
 *   version, template_data, business_status, created_at, updated_at, optional
 *   deleted_at.
 * @returns The details of the newly created business rule template, including
 *   generated id.
 * @throws {Error} If the code + version combination is not unique or other
 *   database errors occur.
 */
export async function postaiCommerceAdminBusinessRuleTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceBusinessRuleTemplates.ICreate;
}): Promise<IAiCommerceBusinessRuleTemplates> {
  const { body } = props;
  try {
    const created =
      await MyGlobal.prisma.ai_commerce_business_rule_templates.create({
        data: {
          id: v4(),
          code: body.code,
          name: body.name,
          version: body.version,
          template_data: body.template_data,
          business_status: body.business_status,
          created_at: body.created_at,
          updated_at: body.updated_at,
          // Only include deleted_at if provided (either string or null, respecting DTO contract)
          ...(body.deleted_at !== undefined
            ? { deleted_at: body.deleted_at }
            : {}),
        },
      });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      version: created.version,
      template_data: created.template_data,
      business_status: created.business_status,
      created_at: created.created_at,
      updated_at: created.updated_at,
      // Map deleted_at: preserve null or undefined according to DTO
      ...(created.deleted_at !== undefined
        ? { deleted_at: created.deleted_at }
        : {}),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "A business rule template with this code and version already exists.",
      );
    }
    throw error;
  }
}
