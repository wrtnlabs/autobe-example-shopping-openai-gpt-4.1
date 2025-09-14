import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import { IPageIAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered, paginated list of channel sections for a specific sales
 * channel (ai_commerce_sections).
 *
 * Returns all sections for the specified channelId, filtered according to
 * advanced parameters including partial search (on name or code),
 * active/inactive toggle, business_status, and sorted and paginated as
 * requested. Always excludes soft-deleted sections (deleted_at IS NOT NULL).
 * Restricted to admin users.
 *
 * @param props - Properties for the patch query including:
 *
 *   - Admin: Authenticated admin user (authorization is implied)
 *   - ChannelId: UUID of the sales channel
 *   - Body: Filter, sort, page, and limit information (may be empty for broad
 *       fetch)
 *
 * @returns Paginated result: list of summary views of all matched sections and
 *   pagination metadata
 * @throws {Error} If parameters are invalid, admin is not authorized, or any
 *   other internal error
 */
export async function patchaiCommerceAdminChannelsChannelIdSections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceSection.IRequest;
}): Promise<IPageIAiCommerceSection.ISummary> {
  const { channelId, body } = props;
  // Extract filters and pagination, with defaults and limits
  const { search, is_active, business_status, sort_by, page, limit } = body;
  // Pagination: force minimum and reasonable max
  const currentPage = typeof page === "number" && page > 0 ? page : 1;
  const pageSize =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (currentPage - 1) * pageSize;
  // Only allow sort_by on permitted fields, default to sort_order
  const allowedOrderFields = [
    "sort_order",
    "name",
    "code",
    "created_at",
    "updated_at",
    "business_status",
  ];
  const orderByField = allowedOrderFields.includes(sort_by || "")
    ? sort_by!
    : "sort_order";
  // Build where conditions functionally and compositionally
  const where = {
    ai_commerce_channel_id: channelId,
    deleted_at: null,
    ...(typeof is_active === "boolean" ? { is_active } : {}),
    ...(typeof business_status === "string" && business_status.length > 0
      ? { business_status }
      : {}),
    ...(search && search.length > 0
      ? {
          OR: [{ name: { contains: search } }, { code: { contains: search } }],
        }
      : {}),
  };
  // Query data and total count in parallel for pagination
  const [sections, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_sections.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [orderByField]: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        is_active: true,
        business_status: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_sections.count({
      where,
    }),
  ]);
  // Build and return result with all tags/format enforced, NO Date type or as assertions
  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(pageSize)),
    },
    data: sections.map((section) => ({
      id: section.id,
      code: section.code,
      name: section.name,
      is_active: section.is_active,
      business_status: section.business_status,
      sort_order: section.sort_order,
      created_at: toISOStringSafe(section.created_at),
      updated_at: toISOStringSafe(section.updated_at),
    })),
  };
}
