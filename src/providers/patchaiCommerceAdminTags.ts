import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTag";
import { IPageIAiCommerceTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a list of tags used in product and discovery modules
 * within the commerce platform.
 *
 * Supports advanced filtering, search, sorting, and pagination for admin- or
 * moderation-facing UIs with high data volume. Filters include tag name
 * (partial), status (enum), and creation/update date ranges. Only admin users
 * can access this endpoint.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.body - Filtering and pagination parameters (name, status,
 *   created_at_from/to, updated_at_from/to, page, limit)
 * @returns Paginated result set of tag summaries (id, name, status) with page
 *   metadata
 * @throws {Error} If database access fails or unauthorized
 */
export async function patchaiCommerceAdminTags(props: {
  admin: AdminPayload;
  body: IAiCommerceTag.IRequest;
}): Promise<IPageIAiCommerceTag.ISummary> {
  const { body } = props;

  // Defensive: Clamp and normalize pagination parameters
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // Build range filters for created_at and updated_at
  const createdAtFilter =
    body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          ...(body.created_at_from !== undefined && {
            gte: body.created_at_from,
          }),
          ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
        }
      : undefined;
  const updatedAtFilter =
    body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          ...(body.updated_at_from !== undefined && {
            gte: body.updated_at_from,
          }),
          ...(body.updated_at_to !== undefined && { lte: body.updated_at_to }),
        }
      : undefined;

  // Build the Prisma where object (filters)
  const where = {
    ...(body.name !== undefined && { name: { contains: body.name } }),
    ...(body.status !== undefined && { status: body.status }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(updatedAtFilter !== undefined && { updated_at: updatedAtFilter }),
  };

  // Query tags and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_tags.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, name: true, status: true },
    }),
    MyGlobal.prisma.ai_commerce_tags.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / (limit === 0 ? 1 : limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
    })),
  };
}
