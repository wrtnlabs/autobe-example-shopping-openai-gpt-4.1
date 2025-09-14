import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBusinessRuleTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a business rule template by ruleId from
 * ai_commerce_business_rule_templates.
 *
 * This endpoint allows system administrators to fetch full details of a
 * specific business rule template, including code, version, serialized rule
 * logic, statuses, and audit fields, using the provided ruleId. The operation
 * enables admins to inspect, review, or prepare the template for workflow
 * changes while ensuring compliance and operational consistency.
 *
 * Authorization is strictly reserved for admins. Accesses are always
 * audit-logged. Attempting to access a non-existent or inaccessible ruleId
 * results in a clear error.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.admin - The authenticated administrator performing the retrieval
 * @param props.ruleId - The UUID of the business rule template to fetch
 * @returns The detailed IAiCommerceBusinessRuleTemplate record for the
 *   specified ruleId
 * @throws {Error} If the rule template does not exist or is deleted
 */
export async function getaiCommerceAdminBusinessRuleTemplatesRuleId(props: {
  admin: AdminPayload;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceBusinessRuleTemplate> {
  const { ruleId } = props;

  const result =
    await MyGlobal.prisma.ai_commerce_business_rule_templates.findUniqueOrThrow(
      {
        where: { id: ruleId, deleted_at: null },
      },
    );

  return {
    id: result.id,
    code: result.code,
    name: result.name,
    version: result.version,
    template_data: result.template_data,
    business_status: result.business_status,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at:
      result.deleted_at === null ? null : toISOStringSafe(result.deleted_at),
  };
}
