import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import { IPageIShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated, filterable list of sales channels.
 *
 * Retrieve a paginated and filterable list of all sales channels defined in the
 * shopping mall backend. Allows filtering by channel code, name, country,
 * currency, and active status. The operation leverages the
 * shopping_mall_ai_backend_channels table and exposes channel metadata needed
 * for administrative management, reporting, and customer-facing selection.
 *
 * Supports advanced queries, pagination, and sorting for business use across
 * regions. Only channels not marked as soft-deleted (deleted_at is null) are
 * included by default, unless otherwise specified. Access may be restricted to
 * administrative or authorized roles based on compliance policy.
 *
 * This API is essential for global and multichannel management in the platform
 * and is frequently called for operational dashboards, onboarding flows, and
 * system-wide configuration scenarios. Error handling includes invalid filter
 * parameters and authorization errors.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making this request
 * @param props.body - Filter, pagination, and query options for searching
 *   channels
 * @returns Paginated list of channel summary information matching search
 *   criteria
 * @throws {Error} When filter parameters are invalid or admin is unauthorized
 */
export async function patch__shoppingMallAiBackend_admin_channels(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendChannel.IRequest;
}): Promise<IPageIShoppingMallAiBackendChannel.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where = {
    ...(body.is_active !== undefined && body.is_active !== null
      ? body.is_active
        ? { deleted_at: null }
        : { NOT: { deleted_at: null } }
      : { deleted_at: null }),
    ...(body.country != null && {
      country: body.country,
    }),
    ...(body.currency != null && {
      currency: body.currency,
    }),
    ...(body.code != null && {
      code: { contains: body.code, mode: "insensitive" as const },
    }),
    ...(body.name != null && {
      name: { contains: body.name, mode: "insensitive" as const },
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_channels.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        code: true,
        name: true,
        country: true,
        currency: true,
        language: true,
        timezone: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_channels.count({ where }),
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
      code: row.code,
      name: row.name,
      country: row.country,
      currency: row.currency,
      language: row.language,
      timezone: row.timezone,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
