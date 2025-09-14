import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IAiCommercePageIComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve and filter comments for a specific review (ai_commerce_comments
 * table).
 *
 * This operation returns a paginated and filtered list of comments associated
 * with a single review, identified by the reviewId path parameter. Supports
 * filtering and searching by author, status, parent, creation/update time, and
 * text, following moderator/admin requirements.
 *
 * Access: Admins only. Fails if review does not exist or is deleted. Pagination
 * and filter options follow IAiCommerceComment.IRequest.
 *
 * @param props - Operation parameters
 * @param props.admin - The authenticated admin making the request
 *   (authorization handled upstream)
 * @param props.reviewId - UUID of the parent review whose comments are being
 *   listed
 * @param props.body - Filter, search, and pagination options (see
 *   IAiCommerceComment.IRequest)
 * @returns An IAiCommercePageIComment.ISummary paginated summary list of
 *   comments for the review
 * @throws {Error} If the review does not exist or has been deleted
 */
export async function patchaiCommerceAdminReviewsReviewIdComments(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IAiCommercePageIComment.ISummary> {
  // Validate review existence
  await MyGlobal.prisma.ai_commerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId, deleted_at: null },
  });

  // Build dynamic Prisma filters from input
  const where: Record<string, unknown> = {
    review_id: props.reviewId,
    deleted_at: null,
    ...(props.body.author_id !== undefined &&
      props.body.author_id !== null && {
        author_id: props.body.author_id,
      }),
    ...(props.body.parent_comment_id !== undefined &&
      props.body.parent_comment_id !== null && {
        parent_comment_id: props.body.parent_comment_id,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.bulletin_id !== undefined &&
      props.body.bulletin_id !== null && {
        bulletin_id: props.body.bulletin_id,
      }),
    ...(props.body.inquiry_id !== undefined &&
      props.body.inquiry_id !== null && {
        inquiry_id: props.body.inquiry_id,
      }),
  };

  // Date range filtering
  if (
    (props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null)
  ) {
    where.created_at = {
      ...(props.body.created_at_from !== undefined &&
        props.body.created_at_from !== null && {
          gte: props.body.created_at_from,
        }),
      ...(props.body.created_at_to !== undefined &&
        props.body.created_at_to !== null && {
          lte: props.body.created_at_to,
        }),
    };
  }

  // Content body search
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    where.body = {
      contains: props.body.search,
      // Do not use mode: "insensitive" for cross-database compatibility
    };
  }

  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Ordering
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (props.body.sort_by) {
    orderBy = {
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    };
  }

  // Parallel query for list & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        author_id: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
  ]);

  // Map result rows to ISummary array,
  // converting all date values using toISOStringSafe()
  const data = rows.map((comment) => ({
    id: comment.id,
    author_id: comment.author_id,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  }));

  return {
    total,
    page,
    limit,
    data,
  };
}
