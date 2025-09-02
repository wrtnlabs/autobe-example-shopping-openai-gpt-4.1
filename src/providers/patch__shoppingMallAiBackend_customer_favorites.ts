import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and list paginated favorites for the authenticated user.
 *
 * Retrieves the authenticated user's favorites in a paginated result,
 * supporting search/filtering by target type, folder, or keywords. Only
 * non-deleted (active) favorites are shown. Advanced search allows users to
 * filter favorites by type (product, address, inquiry), folder, text, or date
 * range. Pagination and sorting options permit scalable browser navigation.
 *
 * Security checks ensure users can only view their own favorites and not those
 * of other users. Provides a summary view of each favorite, with audit
 * timestamps as per evidence policies.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request.
 * @param props.body - Filtering and pagination options for favorite retrieval:
 *   type, folder, search text, date range, pagination controls.
 * @returns Paginated list of favorite summary entities matching the
 *   filter/search.
 * @throws {Error} When a database or system error occurs.
 */
export async function patch__shoppingMallAiBackend_customer_favorites(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendFavorite.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavorite.ISummary> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build filtering conditions inline (schema-first)
  const where = {
    shopping_mall_ai_backend_customer_id: customer.id,
    deleted_at: null,
    ...(body.target_type && { target_type: body.target_type }),
    ...(body.folder_id && {
      shopping_mall_ai_backend_favorite_folder_id: body.folder_id,
    }),
    ...(body.q && {
      title_snapshot: {
        contains: body.q,
        mode: "insensitive" as const,
      },
    }),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Sorting: only allow on certain fields, direction must be literal
  const allowedSortFields = [
    "created_at",
    "target_type",
    "title_snapshot",
  ] as const;
  const sortField = allowedSortFields.includes(body.order_by as any)
    ? (body.order_by as (typeof allowedSortFields)[number])
    : "created_at";
  const sortDir = body.direction === "asc" ? "asc" : "desc";

  // Use type-safe inline assignment for orderBy
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        target_type: true,
        title_snapshot: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      target_type: row.target_type,
      title_snapshot: row.title_snapshot,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
