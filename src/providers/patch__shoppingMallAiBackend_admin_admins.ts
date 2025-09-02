import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import { IPageIShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List admin accounts with advanced search, filtering, and pagination.
 *
 * Returns a paginated result set of administrators (admins) matching optional
 * search filters such as name, username, account active status, and creation
 * date. This operation is restricted to authenticated admins and is intended
 * for dashboard and audit workflows. Only summary profile, contact, and audit
 * timestamps are returned for each admin; sensitive fields are never exposed.
 *
 * @param props - Request object with authentication and search/filter criteria
 * @param props.admin - Authenticated AdminPayload performing the operation
 * @param props.body - Search and pagination/filter parameters (see
 *   IShoppingMallAiBackendAdmin.IRequest)
 * @returns Paginated summary list of admin accounts (see
 *   IPageIShoppingMallAiBackendAdmin.ISummary)
 * @throws {Error} If any underlying DB error occurs or parameters are malformed
 */
export async function patch__shoppingMallAiBackend_admin_admins(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendAdmin.IRequest;
}): Promise<IPageIShoppingMallAiBackendAdmin.ISummary> {
  const { body } = props;
  // Pagination defaults
  const page =
    typeof body.page === "number" && Number.isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const limit =
    typeof body.limit === "number" &&
    Number.isFinite(body.limit) &&
    body.limit > 0 &&
    body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;
  // Filtering criteria
  const where = {
    deleted_at: null,
    ...(typeof body.username === "string" &&
      body.username.length > 0 && {
        username: { contains: body.username, mode: "insensitive" as const },
      }),
    ...(typeof body.name === "string" &&
      body.name.length > 0 && {
        name: { contains: body.name, mode: "insensitive" as const },
      }),
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };
  // Sorting
  const SORTABLE_FIELDS = ["username", "name", "created_at", "updated_at"];
  const sortBy =
    typeof body.sort_by === "string" && SORTABLE_FIELDS.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortDir =
    body.sort_dir === "asc" || body.sort_dir === "desc"
      ? body.sort_dir
      : "desc";
  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_admins.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_admins.count({ where }),
  ]);
  // Map results to DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.max(1, Math.ceil(Number(total) / Number(limit))),
    },
    data: rows.map((row) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      is_active: row.is_active,
      last_login_at:
        row.last_login_at !== undefined && row.last_login_at !== null
          ? toISOStringSafe(row.last_login_at)
          : null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
