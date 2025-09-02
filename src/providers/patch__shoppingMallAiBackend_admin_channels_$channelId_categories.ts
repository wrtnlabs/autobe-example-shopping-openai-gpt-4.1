import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import { IPageIShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filterable list of all categories for a specific
 * channel.
 *
 * This operation is used by channel managers or admins to search and manage
 * category taxonomies, navigational groupings, and business analytics.
 * Categories may be filtered by code, name, parent, or active state. Supports
 * complex queries, with pagination and sorting. Only channelId is required;
 * advanced search behaviors are defined by request body fields.
 *
 * Security: Only accessible to admin roles. Filters applied for code, name,
 * order, and navigation hierarchy help manage business content and validate
 * structure integrity.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.channelId - The UUID of the parent channel for which categories
 *   are managed
 * @param props.body - The search, filter, pagination, and sort parameters for
 *   the category query
 * @returns Paginated list of categories matching search/filter criteria, for
 *   admin/manager UI
 * @throws {Error} When the specified channel does not exist or is not
 *   accessible
 */
export async function patch__shoppingMallAiBackend_admin_channels_$channelId_categories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategory.IRequest;
}): Promise<IPageIShoppingMallAiBackendChannelCategory> {
  const { admin, channelId, body } = props;

  // 1. Check that the channel exists and is not deleted
  const channel =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.findFirst({
      where: {
        id: channelId,
        deleted_at: null,
      },
    });
  if (!channel) {
    throw new Error("Channel not found");
  }

  // 2. Build where conditions
  const where = {
    shopping_mall_ai_backend_channel_id: channelId,
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && {
      name: { contains: body.name, mode: "insensitive" as const },
    }),
    ...(body.parent_id !== undefined && { parent_id: body.parent_id }),
    ...((body.is_active !== undefined &&
      body.is_active === true && { deleted_at: null }) ||
      {}),
    ...((body.is_active !== undefined &&
      body.is_active === false && { NOT: { deleted_at: null } }) ||
      {}),
  };

  // 3. Sorting/orderBy
  const ALLOWED_SORT_FIELDS = [
    "id",
    "code",
    "name",
    "order",
    "created_at",
    "updated_at",
    "description",
  ];
  let orderByArr: Record<string, "asc" | "desc">[];
  if (body.sortBy && ALLOWED_SORT_FIELDS.includes(body.sortBy)) {
    orderByArr = [{ [body.sortBy]: body.sortDir === "desc" ? "desc" : "asc" }];
  } else {
    orderByArr = [{ order: "asc" }, { name: "asc" }];
  }

  // 4. Pagination
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // 5. Query with count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findMany({
      where,
      orderBy: orderByArr,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.count({
      where,
    }),
  ]);

  // 6. Map to DTOs with ISO date formatting
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_ai_backend_channel_id:
      row.shopping_mall_ai_backend_channel_id,
    parent_id: row.parent_id ?? null,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    order: row.order,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: Number(total),
      pages: Math.ceil(Number(total) / limit),
    },
    data,
  };
}
