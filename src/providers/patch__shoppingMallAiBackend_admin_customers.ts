import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import { IPageIShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of customers for admin management.
 *
 * Retrieves a paginated, filterable list of customer accounts from the
 * ShoppingMallAiBackend system, supporting complex search criteria for advanced
 * admin queries. Only accessible to authorized admin users. Returns customer
 * summaries with pagination metadata.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload
 * @param props.body - Customer search, filter, and pagination parameters for
 *   advanced admin queries
 * @returns Paginated customer summary records matching search and filter
 *   criteria.
 * @throws {Error} When query parameters are invalid or admin is unauthorized
 */
export async function patch__shoppingMallAiBackend_admin_customers(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCustomer.IRequest;
}): Promise<IPageIShoppingMallAiBackendCustomer.ISummary> {
  const { admin, body } = props;

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Where filter: verify all fields against schema and null policy for required fields in queries
  const where = {
    deleted_at: null,
    ...(body.email && { email: body.email }),
    ...(body.phone_number && { phone_number: body.phone_number }),
    ...(body.name && { name: body.name }),
    ...(body.nickname && { nickname: body.nickname }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.is_verified !== undefined && { is_verified: body.is_verified }),
    // Date range for last_login_at
    ...(body.last_login_from != null || body.last_login_to != null
      ? {
          last_login_at: {
            ...(body.last_login_from != null && { gte: body.last_login_from }),
            ...(body.last_login_to != null && { lte: body.last_login_to }),
          },
        }
      : {}),
    // Date range for created_at
    ...(body.created_from != null || body.created_to != null
      ? {
          created_at: {
            ...(body.created_from != null && { gte: body.created_from }),
            ...(body.created_to != null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Fetch paginated results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_customers.findMany({
      where,
      orderBy: { created_at: "desc" as const },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        email: true,
        nickname: true,
        is_active: true,
        is_verified: true,
        last_login_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_customers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      nickname: row.nickname ?? null,
      is_active: row.is_active,
      is_verified: row.is_verified,
      last_login_at: row.last_login_at
        ? toISOStringSafe(row.last_login_at)
        : null,
    })),
  };
}
