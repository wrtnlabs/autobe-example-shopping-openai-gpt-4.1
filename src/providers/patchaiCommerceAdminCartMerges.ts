import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartMerge";
import { IPageIAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartMerge";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and retrieve paginated cart merge records from
 * ai_commerce_cart_merges.
 *
 * Retrieves a filtered and paginated list of cart merge events based on
 * advanced search criteria provided in the request body. Supports filtering by
 * source/target cart IDs, actor, reason, date window, and flexible
 * pagination/sorting for audit/analytics/troubleshooting. Only system
 * administrators are authorized to access this operation.
 *
 * @param props - The request props containing authenticated admin and
 *   structured request body for search/filter/pagination
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Request parameters including search, filter, pagination,
 *   and sorting criteria
 * @returns Paginated list of ai_commerce_cart_merges summary records with page
 *   info
 * @throws {Error} If the underlying database query fails
 */
export async function patchaiCommerceAdminCartMerges(props: {
  admin: AdminPayload;
  body: IAiCommerceCartMerge.IRequest;
}): Promise<IPageIAiCommerceCartMerge.ISummary> {
  const { body } = props;
  // Provide defaults for pagination
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  // Unbrand pagination numbers for IPage.IPagination
  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  // Build created_at filter atomically
  let createdAt: { gte?: string; lte?: string } = {};
  if (body.created_from !== undefined && body.created_from !== null) {
    createdAt.gte = body.created_from;
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    createdAt.lte = body.created_to;
  }

  // Compose where clause
  const where = {
    ...(body.source_cart_id !== undefined &&
      body.source_cart_id !== null && {
        source_cart_id: body.source_cart_id,
      }),
    ...(body.target_cart_id !== undefined &&
      body.target_cart_id !== null && {
        target_cart_id: body.target_cart_id,
      }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && {
        actor_id: body.actor_id,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null && {
        reason: body.reason,
      }),
    ...(createdAt.gte !== undefined || createdAt.lte !== undefined
      ? { created_at: createdAt }
      : {}),
  };

  // Run paged query and total count in parallel for efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_merges.findMany({
      where,
      orderBy: {
        created_at: (body.order === "asc" ? "asc" : "desc") as Prisma.SortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        source_cart_id: true,
        target_cart_id: true,
        reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_cart_merges.count({ where }),
  ]);

  // Map to ISummary objects, enforcing correct branding for date/time fields
  const data = rows.map((row) => ({
    id: row.id,
    source_cart_id: row.source_cart_id,
    target_cart_id: row.target_cart_id,
    reason: row.reason,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
