import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import { IPageIShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve filtered, paginated seller accounts (admin-only, soft
 * delete)
 *
 * Enables advanced search and filtering of sellers (merchant accounts) in the
 * shopping mall backend. This operation targets the
 * shopping_mall_ai_backend_sellers table. It supports filtering by legal name,
 * business registration number, email, verification state, and account status.
 * Pagination, search, and sorting are provided for large-scale seller
 * management. Only authorized admin users can access this endpoint, and results
 * include details suitable for compliance review and onboarding/tracking
 * workflows.
 *
 * @param props - Properties for admin authentication and search filters
 * @param props.admin - The authenticated admin user requesting seller data
 * @param props.body - Filter, search, and pagination parameters for sellers
 * @returns Paginated seller list with metadata for onboarding and compliance
 *   review
 * @throws {Error} If authorization fails (admin invalid or inactive)
 */
export async function patch__shoppingMallAiBackend_admin_sellers(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendSeller.IRequest;
}): Promise<IPageIShoppingMallAiBackendSeller.ISummary> {
  const { body } = props;
  // Pagination defaults
  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;

  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && { email: body.email }),
    ...(body.business_registration_number !== undefined &&
      body.business_registration_number !== null && {
        business_registration_number: body.business_registration_number,
      }),
    ...(body.name !== undefined && body.name !== null && { name: body.name }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
    ...(body.is_verified !== undefined &&
      body.is_verified !== null && { is_verified: body.is_verified }),
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
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && { gte: body.updated_at_from }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && { lte: body.updated_at_to }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_sellers.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_sellers.count({ where }),
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
      business_registration_number: row.business_registration_number,
      name: row.name,
      is_active: row.is_active,
      is_verified: row.is_verified,
    })),
  };
}
