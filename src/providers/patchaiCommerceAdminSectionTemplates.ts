import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import { IPageIAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSectionTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search section templates in ai_commerce_section_templates with
 * filtering and pagination.
 *
 * Retrieves a filtered and paginated list of section templates used for
 * defining merchandising layouts and logic in channels. Admins can filter,
 * search, sort, and page through templates. The response contains summaries of
 * templates for catalog and analytics needs.
 *
 * @param props - Provider props
 * @param props.admin - The authenticated admin user making this request
 * @param props.body - Filtering/search/pagination criteria for template listing
 * @returns Paginated summary list of matching section templates
 */
export async function patchaiCommerceAdminSectionTemplates(props: {
  admin: AdminPayload;
  body: IAiCommerceSectionTemplate.IRequest;
}): Promise<IPageIAiCommerceSectionTemplate.ISummary> {
  const { body } = props;
  // Pagination params and normalization
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = typeof rawPage === "number" && rawPage > 0 ? rawPage : 1;
  const limit =
    typeof rawLimit === "number" && rawLimit > 0 && rawLimit <= 100
      ? rawLimit
      : 20;
  const skip = (page - 1) * limit;
  // Allowed sort fields
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "name",
    "code",
    "business_status",
  ];
  const rawSort = body.sort_by ?? "";
  const sortBy = allowedSortFields.includes(rawSort) ? rawSort : "created_at";

  // WHERE clause construction (no Record<string, any>)
  const baseWhere = {
    deleted_at: null,
    ...(body.is_default !== undefined ? { is_default: body.is_default } : {}),
    ...(body.business_status !== undefined
      ? { business_status: body.business_status }
      : {}),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Query in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_section_templates.count({ where: baseWhere }),
    MyGlobal.prisma.ai_commerce_section_templates.findMany({
      where: baseWhere,
      orderBy: { [sortBy]: "desc" },
      skip,
      take: limit,
    }),
  ]);
  const data = rows.map((row) => ({
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
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
    },
    data,
  };
}
