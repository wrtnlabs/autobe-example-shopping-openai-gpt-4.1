import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import { IPageIAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated and filtered list of aiCommerce sales channels (admin
 * only)
 *
 * This API operation enables admin users to search and paginate through sales
 * channel records in the aiCommerce platform. Records may be filtered by
 * activation state, business status, locale, and partial channel name. Only
 * non-deleted records (deleted_at = null) are retrieved. Pagination and sorting
 * is supported, and all results are returned in the standardized
 * IAiCommerceChannel structure, including all key identifiers and business
 * status fields. Access is strictly admin-only by authentication.
 *
 * @param props - The request context, including authenticated admin and
 *   filter/search request body
 * @param props.admin - Authenticated admin credentials payload
 * @param props.body - Filter, sort, and paging criteria per
 *   IAiCommerceChannel.IRequest
 * @returns Paginated list of sales channels matching the filter, sorted and
 *   mapped to API DTO format
 * @throws {Error} If the Prisma operation fails or invalid filters provided
 */
export async function patchaiCommerceAdminChannels(props: {
  admin: AdminPayload;
  body: IAiCommerceChannel.IRequest;
}): Promise<IPageIAiCommerceChannel> {
  const { body } = props;

  // Extract and sanitize pagination
  const page =
    typeof body.page === "number" && Number.isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const limit =
    typeof body.limit === "number" &&
    Number.isFinite(body.limit) &&
    body.limit > 0
      ? body.limit
      : 20;

  // Filter construction, only using schema-verified properties
  const where = {
    deleted_at: null,
    ...(body.isActive !== undefined && { is_active: body.isActive }),
    ...(body.businessStatus !== undefined && {
      business_status: body.businessStatus,
    }),
    ...(body.locale !== undefined && { locale: body.locale }),
    ...(body.name !== undefined &&
      body.name.length > 0 && {
        name: {
          contains: body.name,
        },
      }),
  };

  // Only allow whitelisted sort keys
  const allowedSortBy = ["name", "created_at", "updated_at", "locale", "code"];
  const sortBy =
    body.sortBy && allowedSortBy.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortDirection =
    body.sortDirection === "asc" || body.sortDirection === "desc"
      ? body.sortDirection
      : "desc";

  // Fetch data and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_channels.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_channels.count({ where }),
  ]);

  // Map to DTO, strictly conforming to null/undefined/branding rules
  const data = rows.map((row) => {
    const out = {
      id: row.id,
      code: row.code,
      name: row.name,
      locale: row.locale,
      is_active: row.is_active,
      business_status: row.business_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      // deleted_at is optional+nullable: return undefined if null, else toISOStringSafe
      deleted_at:
        row.deleted_at === null || row.deleted_at === undefined
          ? undefined
          : toISOStringSafe(row.deleted_at),
    };
    return out;
  });

  // Defensive: derive number fields for i32 brand types
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  } satisfies IPageIAiCommerceChannel;
}
