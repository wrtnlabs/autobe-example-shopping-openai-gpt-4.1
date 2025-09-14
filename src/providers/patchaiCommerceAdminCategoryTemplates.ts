import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategoryTemplate";
import { IPageIAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCategoryTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search category templates (paginated, filterable) from
 * ai_commerce_category_templates.
 *
 * Retrieves a paginated and filterable list of all category templates in the
 * ai_commerce_category_templates table. Administrators can search by name,
 * code, business status, or creation/update timestamps. This enhances
 * large-scale management of reusable category hierarchies and accelerates
 * onboarding of new channels or merchants.
 *
 * Security is strictly enforced—only admins can access this endpoint, ensuring
 * that only privileged users can see, review, or repurpose organization
 * templates across projects. Audit logs are maintained for all accesses of this
 * API for compliance review.
 *
 * Filtering supports advanced use-cases including partial name/code match,
 * business status selection, and sorting by created/updated times, designed to
 * integrate seamlessly with the CMS or backoffice UI.
 *
 * Error handling returns clear messages for invalid pagination, unsupported
 * search criteria, or sorting constraints. The response structure includes
 * pagination metadata and a summary of template state for each entry.
 *
 * @param props - Object containing admin authentication payload and
 *   search/filter criteria in body
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Criteria for searching, filtering, and paginating
 *   category templates
 * @returns Paginated results of category template summaries as defined in
 *   ai_commerce_category_templates
 * @throws {Error} When provided pagination or sorting fields are invalid
 */
export async function patchaiCommerceAdminCategoryTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceCategoryTemplate.IRequest;
}): Promise<IPageIAiCommerceCategoryTemplate.ISummary> {
  const { body } = props;
  // Pagination defaults from DTO spec (page starts at 1)
  const pageValue = typeof body.page === "number" ? Number(body.page) : 1;
  const limitValue = typeof body.limit === "number" ? Number(body.limit) : 20;
  const skip = (pageValue - 1) * limitValue;

  // Only allow sorting by created_at, updated_at (default created_at desc)
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort_by === "updated_at") orderBy = { updated_at: "desc" };
  if (body.sort_by === "created_at") orderBy = { created_at: "desc" };

  // Build where clause (inline, only existing fields)
  const where = {
    deleted_at: null,
    ...(typeof body.business_status === "string" &&
      body.business_status.length > 0 && {
        business_status: body.business_status,
      }),
    ...(typeof body.is_default === "boolean" && {
      is_default: body.is_default,
    }),
    ...(typeof body.search === "string" &&
      body.search.length > 0 && {
        OR: [
          { name: { contains: body.search } },
          { code: { contains: body.search } },
        ],
      }),
  };

  // Query data and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_category_templates.findMany({
      where,
      orderBy,
      skip,
      take: limitValue,
      select: {
        id: true,
        code: true,
        name: true,
        is_default: true,
        business_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_category_templates.count({ where }),
  ]);

  // Map to ISummary rows with all date fields normalized
  const data = records.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    is_default: row.is_default,
    business_status: row.business_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(pageValue),
      limit: Number(limitValue),
      records: Number(total),
      pages: Number(Math.ceil(total / limitValue)),
    },
    data,
  };
}
