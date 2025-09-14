import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { IPageIAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceStores";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of stores (ai_commerce_stores
 * table).
 *
 * This endpoint allows administrators to retrieve a paginated and filterable
 * list of all store entities within the system. Supports advanced filtering,
 * sorting, and pagination based on store fields such as store_name, store_code,
 * approval_status, owner_user_id, and seller_profile_id. Only accessible by
 * users with the 'admin' role. Dates are always returned as strings in ISO 8601
 * format as required by the DTO.
 *
 * @param props - Input object containing the authenticated admin and filtering,
 *   sorting, and paging criteria
 * @param props.admin - The authenticated administrator making the request
 * @param props.body - Search/filter criteria and pagination/sorting options;
 *   all fields optional for flexible queries
 * @returns Paginated summary of stores matching the given criteria, including
 *   only the fields defined by IAiCommerceStores.ISummary
 * @throws {Error} If type mismatches, unauthorized access, or database errors
 *   occur. Only authenticated admins may call this endpoint.
 */
export async function patchaiCommerceAdminStores(props: {
  admin: AdminPayload;
  body: IAiCommerceStores.IRequest;
}): Promise<IPageIAiCommerceStores.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only allow sorting by safe fields
  const validSortFields = [
    "store_name",
    "approval_status",
    "created_at",
    "updated_at",
    "store_code",
  ];
  const requestedSort = body.sort ?? "created_at";
  const sortField = validSortFields.includes(requestedSort)
    ? requestedSort
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build where filter using only available fields
  const where = {
    ...(body.store_name !== undefined &&
      body.store_name !== null && {
        store_name: { contains: body.store_name },
      }),
    ...(body.store_code !== undefined &&
      body.store_code !== null && {
        store_code: { contains: body.store_code },
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.owner_user_id !== undefined &&
      body.owner_user_id !== null && {
        owner_user_id: body.owner_user_id,
      }),
    ...(body.seller_profile_id !== undefined &&
      body.seller_profile_id !== null && {
        seller_profile_id: body.seller_profile_id,
      }),
    deleted_at: null,
  };

  const offset = (page - 1) * limit;

  // Run count and paginated query concurrently
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_stores.count({ where }),
    MyGlobal.prisma.ai_commerce_stores.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: offset,
      take: limit,
      select: {
        id: true,
        store_name: true,
        store_code: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);

  const data = rows.map((r) => {
    // Convert all date fields properly, handling deleted_at as optional/null
    return {
      id: r.id,
      store_name: r.store_name,
      store_code: r.store_code,
      approval_status: r.approval_status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    };
  });

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
