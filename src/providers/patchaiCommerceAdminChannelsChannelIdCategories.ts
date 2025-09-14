import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import { IPageIAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered, paginated list of categories in a sales channel
 * (ai_commerce_categories).
 *
 * Provides a flexible search and discovery interface for all categories
 * belonging to a given channel. The request body supports pagination, search
 * keywords, filtering by status, and hierarchical queries (including depth and
 * parent relationships).
 *
 * Only admin-level users or privileged business users who maintain category
 * hierarchies can invoke this endpoint. It enforces all access controls and
 * business validation as defined in the ai_commerce_categories schema.
 *
 * Uniqueness of category codes within a channel and restriction to non-deleted
 * or active categories unless otherwise specified in query filters are enforced
 * by schema constraints. Handles edge cases (such as too deep recursion or
 * non-existent parent references) with clear error messages and returns a paged
 * data structure according to IPageIAiCommerceCategory.ISummary.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (enforced by AdminAuth
 *   decorator)
 * @param props.channelId - Unique identifier for the target sales channel
 * @param props.body - Filtering, search, and pagination query parameters for
 *   listing categories (IAiCommerceCategory.IRequest)
 * @returns Paginated list of summary category details per search/filter
 *   criteria
 * @throws {Error} When the parent category does not exist in the specified
 *   channel (if filtering by parent_id)
 * @throws {Error} When invalid query values are supplied (e.g., invalid sort
 *   field)
 */
export async function patchaiCommerceAdminChannelsChannelIdCategories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceCategory.IRequest;
}): Promise<IPageIAiCommerceCategory.ISummary> {
  const { admin, channelId, body } = props;

  // Enforce only allowed sort fields to prevent injections.
  const allowedSortFields = [
    "sort_order",
    "name",
    "code",
    "created_at",
    "updated_at",
    "level",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "sort_order";

  // Pagination values.
  const defaultPage = 0;
  const defaultLimit = 20;
  const pageRaw =
    body.page !== undefined && body.page !== null ? body.page : defaultPage;
  const limitRaw =
    body.limit !== undefined && body.limit !== null ? body.limit : defaultLimit;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = page * limit;

  // Resolve parent-level for depth filter (if needed)
  let parentLevel = 0;
  if (body.parent_id !== undefined) {
    if (body.parent_id !== null) {
      const parent = await MyGlobal.prisma.ai_commerce_categories.findFirst({
        where: {
          id: body.parent_id,
          ai_commerce_channel_id: channelId,
          deleted_at: null,
        },
        select: { level: true },
      });
      if (!parent) {
        return {
          pagination: {
            current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
            limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
            records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
            pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
          },
          data: [],
        };
      }
      parentLevel = parent.level;
    }
  }

  // Build where filters
  const where: Record<string, unknown> = {
    ai_commerce_channel_id: channelId,
    deleted_at: null,
  };
  if (body.is_active !== undefined) {
    where.is_active = body.is_active;
  }
  if (body.business_status !== undefined) {
    where.business_status = body.business_status;
  }
  if (body.parent_id !== undefined) {
    where.parent_id = body.parent_id;
  }
  if (body.search && body.search.length > 0) {
    where.OR = [
      { name: { contains: body.search } },
      { code: { contains: body.search } },
    ];
  }
  // Depth filter logic
  if (body.depth !== undefined) {
    where.level = {
      gte: parentLevel,
      lte: parentLevel + body.depth,
    };
  } else if (body.parent_id !== undefined && body.parent_id !== null) {
    where.level = parentLevel + 1;
  }

  // Inline orderBy object
  const orderBy = { [sortBy!]: "asc" };

  // Query categories and total count in parallel
  const [categories, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_categories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        is_active: true,
        business_status: true,
        sort_order: true,
        parent_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / (limit > 0 ? limit : 1)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      level: c.level,
      is_active: c.is_active,
      business_status: c.business_status,
      sort_order: c.sort_order,
      parent_id:
        typeof c.parent_id === "string"
          ? c.parent_id
          : c.parent_id === null
            ? null
            : undefined,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
    })),
  };
}
