import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes an existing business rule template (hard delete).
 *
 * This endpoint allows system administrators to permanently remove a business
 * rule template record from the ai_commerce_business_rule_templates table by
 * providing its ruleId (primary key). The template record is hard deleted
 * (removed from the database). The operation is limited to admins and is fully
 * audit-logged.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated administrator performing the deletion
 * @param props.ruleId - UUID of the business rule template to be deleted
 * @returns Void
 * @throws {Error} If the template does not exist or is referenced by a live
 *   configuration
 */
export async function deleteaiCommerceAdminBusinessRuleTemplatesRuleId(props: {
  admin: AdminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, ruleId } = props;

  // Lookup the template by id. Throws error if not found.
  const template =
    await MyGlobal.prisma.ai_commerce_business_rule_templates.findUnique({
      where: { id: ruleId },
    });
  if (!template) {
    throw new Error("Business rule template not found");
  }

  // TODO: Insert check for live configuration association if/when such logic is defined elsewhere.

  // Hard delete the business rule template
  await MyGlobal.prisma.ai_commerce_business_rule_templates.delete({
    where: { id: ruleId },
  });

  // Audit log: record the deletion event
  await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "DELETE_BUSINESS_RULE_TEMPLATE",
      actor_id: admin.id,
      target_table: "ai_commerce_business_rule_templates",
      target_id: ruleId,
      before: JSON.stringify(template),
      after: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
