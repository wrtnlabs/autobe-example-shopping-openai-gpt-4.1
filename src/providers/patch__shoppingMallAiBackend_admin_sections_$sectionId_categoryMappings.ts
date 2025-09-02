import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategoryMapping";
import { IPageIShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelCategoryMapping";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves paginated and filterable list of all category mappings for a given
 * section, including their assigned categories and mapping details.
 *
 * Primarily designed for admin users to manage and audit section-category
 * relationships, platform navigation, and business analytics. Supports advanced
 * query, filter, and pagination on relationships.
 *
 * - Only accessible by admin roles
 * - Supports filtering by related category, mapping created_at, and pagination
 * - Sorting defaults to created_at desc, but honors sort param for known fields
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin payload
 * @param props.sectionId - UUID for the section to list category mappings for
 * @param props.body - Pagination, sorting, and filter criteria
 * @returns Paginated list of category mappings and their metadata
 * @throws {Error} If the specified section does not exist or on database error
 */
export async function patch__shoppingMallAiBackend_admin_sections_$sectionId_categoryMappings(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategoryMapping.IRequest;
}): Promise<IPageIShoppingMallAiBackendChannelCategoryMapping> {
  const { sectionId, body } = props;
  // All requests already checked for admin role (authorization decorator contract)

  // Pagination params (default 1/20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Only allow sorting by valid column fields; default to created_at desc
  const validSortFields = [
    "created_at",
    "id",
    "shopping_mall_ai_backend_channel_category_id",
    "shopping_mall_ai_backend_channel_section_id",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    body.sort &&
    validSortFields.includes(body.sort.replace(/^(\-|\+)/, ""))
  ) {
    const direction = body.sort.startsWith("-") ? "desc" : "asc";
    const sortField = body.sort.replace(/^(\-|\+)/, "");
    orderBy = { [sortField]: direction };
  }

  // Build where clause using schema fields only; handle null/undefined for required fields
  const where = {
    shopping_mall_ai_backend_channel_section_id: sectionId,
    ...(body.filter_category_id !== undefined &&
      body.filter_category_id !== null && {
        shopping_mall_ai_backend_channel_category_id: body.filter_category_id,
      }),
    ...(body.created_from !== undefined &&
      body.created_from !== null && {
        created_at: { gte: body.created_from },
      }),
    ...(body.created_to !== undefined &&
      body.created_to !== null && {
        created_at: {
          ...(body.created_from !== undefined &&
            body.created_from !== null && {
              gte: body.created_from,
            }),
          lte: body.created_to,
        },
      }),
  };

  // When both from/to, Prisma expects one object; when only one, assign accordingly
  let finalWhere = where;
  if (
    body.created_from !== undefined &&
    body.created_from !== null &&
    body.created_to !== undefined &&
    body.created_to !== null
  ) {
    finalWhere = {
      ...where,
      created_at: {
        gte: body.created_from,
        lte: body.created_to,
      },
    };
  }

  // Get [paged result, total count]
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.findMany(
      {
        where: finalWhere,
        orderBy,
        skip,
        take: Number(limit),
      },
    ),
    MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.count({
      where: finalWhere,
    }),
  ]);

  // Convert each row to API shape, transforming Date to string with tag
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_channel_section_id:
        row.shopping_mall_ai_backend_channel_section_id,
      shopping_mall_ai_backend_channel_category_id:
        row.shopping_mall_ai_backend_channel_category_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
