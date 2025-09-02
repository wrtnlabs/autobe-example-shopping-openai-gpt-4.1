import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import { IPageIShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filtered list of all global/system configuration
 * settings (system configs).
 *
 * Supports advanced filtering, sorting, soft-delete logic, and returns full
 * pagination metadata. Only accessible to authenticated admins / DevOps staff.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making this request; authorization
 *   required
 * @param props.body - Search, filter, and pagination criteria following
 *   IShoppingMallAiBackendSystemConfig.IRequest
 * @returns Paginated response containing configuration records and paging info
 * @throws {Error} If the user is not an authorized admin
 */
export async function patch__shoppingMallAiBackend_admin_systemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendSystemConfig.IRequest;
}): Promise<IPageIShoppingMallAiBackendSystemConfig> {
  const { admin, body } = props;

  // Authorization check
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: Only admins may access system configs");
  }

  // Pagination defaults
  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(body.key !== undefined && body.key !== null && { key: body.key }),
    ...(body.value !== undefined &&
      body.value !== null && {
        value: { contains: body.value, mode: "insensitive" as const },
      }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: {
          contains: body.description,
          mode: "insensitive" as const,
        },
      }),
    ...(body.effective_from !== undefined && body.effective_from !== null
      ? { effective_from: { gte: body.effective_from } }
      : {}),
    ...(body.effective_to !== undefined && body.effective_to !== null
      ? { effective_to: { lte: body.effective_to } }
      : {}),
    ...(body.created_at_from !== undefined && body.created_at_from !== null
      ? { created_at: { gte: body.created_at_from } }
      : {}),
    ...(body.created_at_to !== undefined && body.created_at_to !== null
      ? { created_at: { lte: body.created_at_to } }
      : {}),
  };

  // Sorting (validate sort_by field against allowed list)
  const allowedSortFields = [
    "id",
    "key",
    "value",
    "effective_from",
    "effective_to",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = body.order === "asc" ? ("asc" as const) : ("desc" as const);

  // Query with pagination and filter
  const [configs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_system_configs.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_system_configs.count({
      where,
    }),
  ]);

  // Map results to API DTO, converting all Date fields to ISO string as required
  const data = configs.map((cfg) => ({
    id: cfg.id,
    key: cfg.key,
    value: cfg.value,
    description: cfg.description ?? null,
    effective_from: cfg.effective_from
      ? toISOStringSafe(cfg.effective_from)
      : null,
    effective_to: cfg.effective_to ? toISOStringSafe(cfg.effective_to) : null,
    created_at: toISOStringSafe(cfg.created_at),
    updated_at: toISOStringSafe(cfg.updated_at),
    deleted_at: cfg.deleted_at ? toISOStringSafe(cfg.deleted_at) : null,
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
