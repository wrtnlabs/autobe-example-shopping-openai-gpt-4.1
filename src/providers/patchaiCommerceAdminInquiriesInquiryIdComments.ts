import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get paginated list of comments under a specific inquiry
 * (ai_commerce_comments).
 *
 * This operation retrieves a paginated, filtered list of comments associated
 * with a specific inquiry from the ai_commerce_comments table. Supports
 * advanced querying by author, moderation status, timestamps, parent/threading,
 * and fulltext search. Results are suitable for admin moderation and system
 * management use cases. Only includes rows not soft-deleted.
 *
 * @param props - The query and filter properties for comment listing
 * @param props.admin - Authenticated admin making the request (full system
 *   access)
 * @param props.inquiryId - The UUID of the inquiry to retrieve comments for
 * @param props.body - Filter/search query. Allows filtering on author, status,
 *   time, parent, and body content
 * @returns Paginated summary of comments under the inquiry, for admin panels or
 *   reporting
 * @throws {Error} If the inquiry does not exist or params are invalid
 */
export async function patchaiCommerceAdminInquiriesInquiryIdComments(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IPageIAiCommerceComment.ISummary> {
  const { admin, inquiryId, body } = props;

  // 1. Ensure inquiry exists
  await MyGlobal.prisma.ai_commerce_inquiries.findUniqueOrThrow({
    where: { id: inquiryId },
  });

  // 2. Build where clause (immutable)
  const where = {
    inquiry_id: inquiryId,
    deleted_at: null,
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.parent_comment_id !== undefined && {
      parent_comment_id: body.parent_comment_id,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search.length > 0 && { body: { contains: body.search } }),
  };

  // 3. Pagination logic
  const page = body.page !== undefined ? Number(body.page) : 1;
  const limit = body.limit !== undefined ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;
  const allowedSortFields = ["created_at", "status"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";
  const orderBy = { [sort_by]: sort_order };

  // 4. Query for results & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
  ]);

  // 5. Map result rows to IAiCommerceComment.ISummary (convert dates & brands)
  const data = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    body: row.body,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 6. Compose response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
