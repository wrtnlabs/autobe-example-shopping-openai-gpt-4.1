import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBusinessRuleTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBusinessRuleTemplate";
import { IPageIAiCommerceBusinessRuleTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceBusinessRuleTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve business rule templates (paginated) from
 * ai_commerce_business_rule_templates.
 *
 * This endpoint allows authenticated admin users to retrieve a paginated,
 * searchable, and sortable list of business rule templates for administrative
 * review and configuration management. Only admin users may access this
 * operation; all accesses are to be logged for compliance. The listing supports
 * search by template code or name, business status filtering, sorting, and
 * pagination according to UI requirements.
 *
 * @param props - Object containing the authenticated admin user and request
 *   parameters
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Search/filtering parameters including search,
 *   business_status, sort_by, page, and limit
 * @returns Paginated collection of template summaries
 * @throws {Error} When request is unauthenticated or unauthorized
 */
export async function patchaiCommerceAdminBusinessRuleTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceBusinessRuleTemplate.IRequest;
}): Promise<IPageIAiCommerceBusinessRuleTemplate.ISummary> {
  const { admin, body } = props;
  if (!admin) throw new Error("Unauthorized: Admin access required");

  // Pagination logic with defaults and safety caps
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Math.max(Number(pageRaw), 1);
  let limit = Math.max(Number(limitRaw), 1);
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  // Allowed sort fields for safety
  const allowedSortFields: readonly string[] = [
    "updated_at",
    "created_at",
    "code",
    "version",
    "name",
    "business_status",
  ];
  let sortField = body.sort_by ?? "updated_at";
  if (!allowedSortFields.includes(sortField)) sortField = "updated_at";

  // Where clause with soft delete and optional filters
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.search
      ? {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Fetch data and count in parallel for efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_business_rule_templates.findMany({
      where,
      orderBy: { [sortField]: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_business_rule_templates.count({ where }),
  ]);

  // Transform rows to ISummary, converting Date to ISO string for all date-time fields
  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    version: row.version,
    business_status: row.business_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination info uses Number() to ensure the correct type and branding; see rules.
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
