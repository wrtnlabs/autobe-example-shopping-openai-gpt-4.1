import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBulletin";
import { IPageIAiCommerceBulletin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceBulletin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Advanced, paginated search/filter for ai_commerce_bulletins with sorting and
 * filtering.
 *
 * This operation allows an admin to search, filter, and paginate bulletins
 * (system notices/announcements) within the ai_commerce_bulletins table. It
 * supports filtering by title text, status, visibility, author, and creation
 * date range. All results exclude soft-deleted bulletin entries. The response
 * provides summary fields for each bulletin and complete pagination metadata
 * suitable for admin dashboard UI.
 *
 * Only admins may access the full set of bulletins, including those of all
 * moderation statuses. Filtering and sorting are robust and secure, with strong
 * type and schema guarantees.
 *
 * @param props - Operation props
 * @param props.admin - The authenticated admin user requesting the bulletin
 *   list
 * @param props.body - The advanced search and filter criteria (see
 *   IAiCommerceBulletin.IRequest)
 * @returns Paginated list of bulletin summaries matching the provided filters
 * @throws {Error} On unexpected database or environment errors
 */
export async function patchaiCommerceAdminBulletins(props: {
  admin: AdminPayload;
  body: IAiCommerceBulletin.IRequest;
}): Promise<IPageIAiCommerceBulletin.ISummary> {
  const { body } = props;

  // Defensive defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;

  // Filtering: Only include bulletins not soft-deleted
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.visibility !== undefined &&
      body.visibility !== null && { visibility: body.visibility }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.title !== undefined &&
      body.title !== null && { title: { contains: body.title } }),
    // Date range filter for creation date
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

  // Only allow sorting by certain columns for safety
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "title",
    "status",
    "visibility",
  ];
  const sort_by: string = allowedSortFields.includes(body.sort_by ?? "")
    ? String(body.sort_by)
    : "created_at";
  const sort_dir: "asc" | "desc" = body.sort_dir === "asc" ? "asc" : "desc";

  // Retrieve bulletins and total count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_bulletins.findMany({
      where,
      orderBy: { [sort_by]: sort_dir },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        author_id: true,
        title: true,
        visibility: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_bulletins.count({ where }),
  ]);

  // Transform results to API summary DTO with strict date handling
  const data = rows.map(
    (row): IAiCommerceBulletin.ISummary => ({
      id: row.id,
      author_id: row.author_id,
      title: row.title,
      visibility: row.visibility,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    }),
  );

  const records = Number(total);
  const result: IPageIAiCommerceBulletin.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records,
      pages: Math.ceil(records / Number(limit)),
    },
    data,
  };
  return result;
}
