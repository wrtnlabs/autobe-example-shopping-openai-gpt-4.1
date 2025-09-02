import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import { IPageIShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebook";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and search codebooks with pagination for business configuration
 *
 * This operation retrieves a paginated, filterable list of all codebooks
 * defined within the shoppingMallAiBackend system. Codebooks are used as
 * business dictionaries for statuses, regions, option tags, etc., and are
 * critical to dynamic business logic configuration. It allows advanced
 * searching by code, name, or description, and provides support for sorting and
 * pagination. Operates directly on the shopping_mall_ai_backend_codebooks
 * Prisma schema table. The returned response includes summary details for each
 * codebook, supporting both administrative and integration use cases.
 *
 * Only users with admin privileges can access the complete codebook list for
 * configuration or integration purposes.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 *   (AdminPayload, validated)
 * @param props.body - Filter, search, and pagination criteria for codebooks
 * @returns Paginated, summarized codebook data matching the filter/search
 *   criteria
 * @throws {Error} If the authenticated admin is invalid, inactive, or not
 *   enrolled
 */
export async function patch__shoppingMallAiBackend_admin_codebooks(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCodebook.IRequest;
}): Promise<IPageIShoppingMallAiBackendCodebook.ISummary> {
  const { admin, body } = props;

  // Authorization — check admin existence/active
  const adminResult =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: { id: admin.id, is_active: true, deleted_at: null },
    });
  if (!adminResult) throw new Error("Unauthorized: Invalid or inactive admin");

  // Filter & search criteria
  const {
    code,
    name,
    created_from,
    created_to,
    deleted,
    page = 1,
    limit = 20,
    sort,
  } = body;

  // Build where clause inline
  const where = {
    ...(typeof code === "string" &&
      code.length > 0 && {
        code: { contains: code, mode: "insensitive" as const },
      }),
    ...(typeof name === "string" &&
      name.length > 0 && {
        name: { contains: name, mode: "insensitive" as const },
      }),
    ...(typeof deleted === "boolean"
      ? deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : {}),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from && { gte: created_from }),
            ...(created_to && { lte: created_to }),
          },
        }
      : {}),
  };

  // Pagination -- default page/limit if not provided
  const pg = Number(page) > 0 ? Number(page) : 1;
  const lim = Number(limit) > 0 ? Number(limit) : 20;
  const skip = (pg - 1) * lim;
  const take = lim;

  // Sorting
  let orderBy: { [field: string]: "asc" | "desc" } = { created_at: "desc" };
  if (typeof sort === "string" && sort.length > 0) {
    const [field, direction] = sort.split(":");
    const allowedSortFields = ["code", "name", "created_at", "updated_at"];
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: direction === "asc" ? "asc" : "desc" };
    }
  }

  // Query results + total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_codebooks.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_codebooks.count({ where }),
  ]);

  // Format and return result, ensuring all Date fields are string & tags.Format
  return {
    pagination: {
      current: Number(pg),
      limit: Number(lim),
      records: total,
      pages: Math.max(1, Math.ceil(total / lim)),
    },
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
