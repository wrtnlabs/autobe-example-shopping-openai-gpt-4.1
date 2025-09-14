import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";

/**
 * Paginated, filterable comment list for a given bulletin (ai_commerce_comments
 * by bulletin).
 *
 * This endpoint retrieves a paginated, filterable list of comments associated
 * with the provided bulletinId. Comments can be filtered by author, parent
 * comment, status, creation date range, and searched by content. Results are
 * sorted and paginated according to the input options.
 *
 * @param props - Request properties
 * @param props.bulletinId - UUID of the bulletin whose comments to list
 * @param props.body - Filtering, pagination, and sort options as
 *   IAiCommerceComment.IRequest
 * @returns Paginated summary list of comments for this bulletin
 * @throws {Error} If the bulletin with the given ID does not exist
 */
export async function patchaiCommerceBulletinsBulletinIdComments(props: {
  bulletinId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IPageIAiCommerceComment.ISummary> {
  const { bulletinId, body } = props;

  // Default pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 1. Verify bulletin exists
  const bulletin = await MyGlobal.prisma.ai_commerce_bulletins.findUnique({
    where: { id: bulletinId },
    select: { id: true },
  });
  if (!bulletin) throw new Error("Bulletin not found");

  // 2. Compose where clause for comments
  const where = {
    // Only comments for this bulletin, not deleted
    bulletin_id: bulletinId,
    deleted_at: null,
    // author_id filter, if provided
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    // parent_comment_id filter, if provided
    ...(body.parent_comment_id !== undefined &&
      body.parent_comment_id !== null && {
        parent_comment_id: body.parent_comment_id,
      }),
    // status
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    // Date range (created_at)
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    // search
    ...(body.search !== undefined &&
      body.search !== null && {
        body: {
          contains: body.search,
        },
      }),
  };

  // 3. Sorting
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  // 4. Query comments and count concurrently
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
  ]);

  // 5. Format result for API
  const data = comments.map(
    (c): IAiCommerceComment.ISummary => ({
      id: c.id,
      author_id: c.author_id,
      body: c.body,
      status: c.status,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
