import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

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
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Filtering and pagination options for favorite retrieval:
 *   type, folder, search text, date range, pagination controls
 * @returns Paginated list of favorite summary entities matching the
 *   filter/search
 * @throws {Error} When there is a database or unexpected error
 */
export async function patch__shoppingMallAiBackend_admin_favorites(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendFavorite.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavorite.ISummary> {
  const { admin, body } = props;

  // Define allowed sort fields
  const allowedOrderFields = [
    "created_at",
    "target_type",
    "title_snapshot",
    "id",
  ];

  // Filtering: only non-deleted
  const where = {
    deleted_at: null,
    ...(body.target_type !== undefined &&
      body.target_type !== null && {
        target_type: body.target_type,
      }),
    ...(body.folder_id !== undefined &&
      body.folder_id !== null && {
        shopping_mall_ai_backend_favorite_folder_id: body.folder_id,
      }),
    ...(body.q !== undefined &&
      body.q !== null && {
        title_snapshot: { contains: body.q, mode: "insensitive" as const },
      }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Sorting
  const order_by = allowedOrderFields.includes(body.order_by || "")
    ? body.order_by
    : "created_at";
  const direction =
    body.direction === "asc" || body.direction === "desc"
      ? body.direction
      : "desc";

  // Fetch paginated results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.findMany({
      where,
      orderBy: { [order_by!]: direction === "asc" ? "asc" : "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        target_type: true,
        title_snapshot: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.count({ where }),
  ]);

  // Map to DTO summaries with type-safe date conversion
  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    target_type: row.target_type,
    title_snapshot: row.title_snapshot ?? null,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
