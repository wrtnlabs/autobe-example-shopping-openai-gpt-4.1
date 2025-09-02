import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import { IPageIShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelSection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated, filterable list of channel sections by channel ID.
 *
 * Returns a paginated and filterable list of all channel sections (such as
 * home, sale, featured) within a given channel. Each section is organized as a
 * node in a tree, supporting nesting and ordering. Maps to
 * shopping_mall_ai_backend_channel_sections in the Prisma schema. The result
 * assists administrators in configuring the storefront layout and navigation
 * for a given channel. Sections logically deleted (soft-deleted) are excluded
 * by default. Requires channelId as a path parameter.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.channelId - Unique identifier for the channel whose sections are
 *   to be listed
 * @param props.body - Filtering, pagination, and sorting parameters for the
 *   listing
 * @returns Paginated list of section summaries matching the specified channel,
 *   filtered and sorted as requested
 * @throws {Error} When database access fails or business logic requires
 *   explicit rejection (authentication is validated upstream)
 */
export async function patch__shoppingMallAiBackend_admin_channels_$channelId_sections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelSection.IRequest;
}): Promise<IPageIShoppingMallAiBackendChannelSection.ISummary> {
  const { admin, channelId, body } = props;

  // Pagination and sorting
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const offset = (page - 1) * limit;

  // Allowed sortable fields (must match actual DB columns and API ISummary)
  const allowedSortFields = [
    "id",
    "code",
    "name",
    "order",
    "parent_id",
    "created_at",
    "updated_at",
  ];
  const sortBy = allowedSortFields.includes(body.sortBy ?? "")
    ? (body.sortBy ?? "order")
    : "order";
  const sortDir = body.sortDir === "asc" ? "asc" : "desc";

  // Build filtering conditionally, only including fields present in schema
  const where = {
    shopping_mall_ai_backend_channel_id: channelId,
    deleted_at: null,
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined &&
      body.name !== "" && {
        name: { contains: body.name, mode: "insensitive" as const },
      }),
    ...(body.parent_id !== undefined && { parent_id: body.parent_id }),
  };

  // Fetch paged results and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.count({ where }),
  ]);

  // Map DB results to DTO summary with strict date string conversion
  const data = results.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    order: row.order,
    parent_id: row.parent_id ?? null,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Return paginated result matching the API contract
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
