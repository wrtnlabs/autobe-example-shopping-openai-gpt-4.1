import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceTagModeration";
import { IPageIAiCommerceTagModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceTagModeration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and list moderation events for a tag by tagId, supporting filtering,
 * pagination, and evidence review.
 *
 * This endpoint allows administrators to retrieve the full, filterable
 * moderation history for a specific tag, including approvals, rejections,
 * flags, suspensions, and any evidence/rationale notes. All moderation actions
 * are strictly logged and available for compliance review and workflow
 * traceability. Optional filters by action, time window, or moderator can
 * narrow the results. Pagination is enforced.
 *
 * Only admins may access this endpoint. Unauthorized access must not return any
 * data. All accesses to moderation data are traceable and auditable by design.
 *
 * @param props - Object including:
 *
 *   - Admin: AdminPayload – the authenticated admin performing the search
 *       (authorization enforced)
 *   - TagId: string & tags.Format<'uuid'> – the tag whose moderation history is
 *       being searched
 *   - Body: IAiCommerceTagModeration.IRequest – filtering and pagination controls
 *
 * @returns IPageIAiCommerceTagModeration – paginated result set of moderation
 *   event records, with filter and pagination details
 * @throws {Error} If the tag does not exist or the user is not an admin, or for
 *   internal errors
 */
export async function patchaiCommerceAdminTagsTagIdModeration(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: IAiCommerceTagModeration.IRequest;
}): Promise<IPageIAiCommerceTagModeration> {
  const { tagId, body } = props;

  // Pagination controls (defaults)
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Compose filtering conditions
  const where: Record<string, unknown> = {
    ai_commerce_tag_id: tagId,
    ...(body.action !== undefined && { moderation_action: body.action }),
    ...(body.moderatorId !== undefined && { moderated_by: body.moderatorId }),
    ...(body.fromDate !== undefined || body.toDate !== undefined
      ? {
          created_at: {
            ...(body.fromDate !== undefined && { gte: body.fromDate }),
            ...(body.toDate !== undefined && { lte: body.toDate }),
          },
        }
      : {}),
  };

  // Query dataset and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_tag_moderation.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_tag_moderation.count({ where }),
  ]);

  // Convert rows to DTOs
  const data = rows.map(
    (row): IAiCommerceTagModeration => ({
      id: row.id,
      ai_commerce_tag_id: row.ai_commerce_tag_id,
      moderation_action: row.moderation_action,
      moderated_by: row.moderated_by,
      moderation_reason: row.moderation_reason ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    }),
  );

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
