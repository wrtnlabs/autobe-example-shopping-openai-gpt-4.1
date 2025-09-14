import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBusinessRuleTemplates } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplates";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing business rule template
 * (ai_commerce_business_rule_templates).
 *
 * This endpoint allows administrators to update an existing rule template by
 * ruleId. Admins can patch the name, version, template_data, business_status,
 * deleted_at, and updated_at properties. If updated_at is not provided, the
 * function will set it automatically to the time of update. Ensures all updates
 * are compliant with business constraints and audit needs, returning the
 * freshly updated record.
 *
 * @param props - Function properties
 * @param props.admin - Authenticated AdminPayload performing the operation
 * @param props.ruleId - UUID of the rule template to update
 * @param props.body - IAiCommerceBusinessRuleTemplates.IUpdate structure
 *   describing update fields
 * @returns The updated business rule template record
 * @throws {Error} If the template does not exist, or if update violates
 *   uniqueness constraints
 */
export async function putaiCommerceAdminBusinessRuleTemplatesRuleId(props: {
  admin: AdminPayload;
  ruleId: string & tags.Format<"uuid">;
  body: IAiCommerceBusinessRuleTemplates.IUpdate;
}): Promise<IAiCommerceBusinessRuleTemplates> {
  const { ruleId, body } = props;
  // Step 1: Locate existing record
  const existing =
    await MyGlobal.prisma.ai_commerce_business_rule_templates.findFirst({
      where: { id: ruleId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Business rule template not found");
  }
  // Step 2: Calculate updates, set updated_at if missing
  const now = toISOStringSafe(new Date());
  // Build update object (patch only fields provided)
  const update: {
    name?: string;
    version?: number;
    template_data?: string;
    business_status?: string;
    updated_at?: string;
    deleted_at?: string | null;
  } = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.version !== undefined) update.version = body.version;
  if (body.template_data !== undefined)
    update.template_data = body.template_data;
  if (body.business_status !== undefined)
    update.business_status = body.business_status;
  if (body.deleted_at !== undefined) update.deleted_at = body.deleted_at;
  // If updated_at is provided, trust it; else, use system now
  update.updated_at = body.updated_at !== undefined ? body.updated_at : now;
  // Step 3: Execute update
  await MyGlobal.prisma.ai_commerce_business_rule_templates.update({
    where: { id: ruleId },
    data: update,
  });
  // Step 4: Fetch updated record and map to DTO
  const updated =
    await MyGlobal.prisma.ai_commerce_business_rule_templates.findFirstOrThrow({
      where: { id: ruleId },
    });
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    version: updated.version,
    template_data: updated.template_data,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
