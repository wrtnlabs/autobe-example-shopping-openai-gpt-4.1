import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IAiCommercePageIComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieve and filter comments for a specific review (ai_commerce_comments
 * table).
 *
 * This endpoint allows an authenticated buyer to retrieve a paginated,
 * filtered, and sortable list of comments that are attached to a specific
 * review. The search supports advanced filters such as status, author, parent,
 * and creation/update timestamps, and allows text search in comment body.
 * Results are formatted for summary UI display, including total count and
 * current pagination metadata.
 *
 * Authorization rules:
 *
 * - Buyers may view comments for reviews that they own or any review marked as
 *   visible (e.g., public).
 * - The review must exist and must not be deleted.
 *
 * @param props - Parameters for the API call
 * @param props.buyer - Authenticated buyer making the request
 * @param props.reviewId - UUID of the parent review to filter comments for
 * @param props.body - Filter, search and paging parameters
 *   (IAiCommerceComment.IRequest)
 * @returns IAiCommercePageIComment.ISummary containing comment list and
 *   pagination
 * @throws {Error} If the review is not found, is deleted, or the buyer is not
 *   authorized to access
 */
export async function patchaiCommerceBuyerReviewsReviewIdComments(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IAiCommercePageIComment.ISummary> {
  // Step 1: Validate review exists and is not soft-deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
    select: { id: true, author_id: true, visibility: true },
  });
  if (!review) throw new Error("Review not found or has been deleted");
  // Step 1b: Enforce buyer authorization (must be review author or review must be public)
  if (review.author_id !== props.buyer.id && review.visibility !== "public") {
    throw new Error(
      "You are not authorized to access comments for this review",
    );
  }

  // Step 2: Parse paging and sorting
  const defaultPage = 1;
  const defaultLimit = 20;
  const page =
    typeof props.body.page === "number" && props.body.page >= 1
      ? props.body.page
      : defaultPage;
  const limit =
    typeof props.body.limit === "number" && props.body.limit >= 1
      ? props.body.limit
      : defaultLimit;
  const skip = (page - 1) * limit;

  // Step 3: Build Prisma WHERE clause for advanced query
  // Only include filters that are provided (not undefined), and obey required patterns
  const whereQuery: Record<string, unknown> = {
    review_id: props.reviewId,
    deleted_at: null,
  };
  if (props.body.status !== undefined) whereQuery.status = props.body.status;
  if (props.body.author_id !== undefined)
    whereQuery.author_id = props.body.author_id;
  if (props.body.parent_comment_id !== undefined)
    whereQuery.parent_comment_id = props.body.parent_comment_id;
  if (props.body.bulletin_id !== undefined)
    whereQuery.bulletin_id = props.body.bulletin_id;
  if (props.body.inquiry_id !== undefined)
    whereQuery.inquiry_id = props.body.inquiry_id;
  if (props.body.review_id !== undefined)
    whereQuery.review_id = props.body.review_id;

  // Date range filter for created_at
  let createdAtWhere:
    | Record<string, string & tags.Format<"date-time">>
    | undefined;
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
  ) {
    createdAtWhere = {
      gte: props.body.created_at_from,
      lte: props.body.created_at_to,
    };
  } else if (props.body.created_at_from !== undefined) {
    createdAtWhere = { gte: props.body.created_at_from };
  } else if (props.body.created_at_to !== undefined) {
    createdAtWhere = { lte: props.body.created_at_to };
  }
  if (createdAtWhere) (whereQuery as any).created_at = createdAtWhere;

  // Text search: only perform contains on body field (not IDs)
  if (props.body.search !== undefined && props.body.search !== "") {
    (whereQuery as any).body = { contains: props.body.search };
  }

  // Step 4: Validate and resolve sort_by
  const allowedSortBy = [
    "created_at",
    "updated_at",
    "status",
    "author_id",
    "body",
  ];
  const sortBy: string =
    props.body.sort_by && allowedSortBy.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.sort_order === "asc" ? "asc" : "desc";
  const orderBy = { [sortBy]: sortOrder };

  // Step 5: Fetch comments & total count in parallel
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where: whereQuery,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_comments.count({
      where: whereQuery,
    }),
  ]);

  // Step 6: Transform results
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

  // Step 7: Return in IAiCommercePageIComment.ISummary structure
  return {
    total,
    page,
    limit,
    data,
  };
}
