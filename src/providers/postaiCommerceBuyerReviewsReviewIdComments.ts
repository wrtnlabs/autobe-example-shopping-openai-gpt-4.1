import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new comment on the specified review (ai_commerce_comments table).
 *
 * This endpoint allows authenticated buyers to create a new comment (top-level
 * or reply) attached to a given review (referenced by reviewId). The body must
 * contain comment text and may specify a parent_comment_id for threading, as
 * well as a status (defaults to 'published'). The function verifies that the
 * review exists and is not soft-deleted, and—if threading—a valid parent
 * comment exists, is active, and is for the same review. The new comment is
 * created in ai_commerce_comments and returned as a fully resolved
 * IAiCommerceComment entity for UI rendering.
 *
 * @param props - Request payload object
 * @param props.buyer - Authenticated buyer (author of the comment,
 *   BuyerPayload)
 * @param props.reviewId - UUID of the review to comment on
 * @param props.body - IAiCommerceComment.ICreate, comment content and optional
 *   fields
 * @returns Full IAiCommerceComment object
 * @throws {Error} If the review does not exist or is deleted, or if threading
 *   to an invalid parent.
 */
export async function postaiCommerceBuyerReviewsReviewIdComments(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { buyer, reviewId, body } = props;

  // Step 1: Ensure the review exists and is not deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findUnique({
    where: { id: reviewId },
    select: { id: true, deleted_at: true },
  });
  if (!review || review.deleted_at !== null) {
    throw new Error("Review not found or has been deleted");
  }

  // Step 2: If parent_comment_id is specified, ensure it exists, is not deleted, and belongs to the same review
  let parent_comment_id: (string & tags.Format<"uuid">) | undefined = undefined;
  if (
    typeof body.parent_comment_id === "string" &&
    body.parent_comment_id.length > 0
  ) {
    const parent = await MyGlobal.prisma.ai_commerce_comments.findUnique({
      where: { id: body.parent_comment_id },
      select: { id: true, review_id: true, deleted_at: true },
    });
    if (
      !parent ||
      parent.deleted_at !== null ||
      parent.review_id !== reviewId
    ) {
      throw new Error(
        "Parent comment not found, has been deleted, or is not on this review",
      );
    }
    parent_comment_id = body.parent_comment_id;
  } else {
    parent_comment_id = undefined;
  }

  // Step 3: Compose creation data
  const now = toISOStringSafe(new Date());
  const id = v4();
  const status =
    typeof body.status === "string" && body.status.length > 0
      ? body.status
      : "published";

  // Step 4: Create the comment
  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id,
      author_id: buyer.id,
      parent_comment_id: parent_comment_id ?? undefined,
      bulletin_id: undefined,
      inquiry_id: undefined,
      review_id: reviewId,
      body: body.body,
      status,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Step 5: Return full IAiCommerceComment (properly handling brand and null/undefined)
  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: created.bulletin_id ?? undefined,
    inquiry_id: created.inquiry_id ?? undefined,
    review_id: created.review_id ?? undefined,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && typeof created.deleted_at === "string"
        ? created.deleted_at
        : created.deleted_at === null
          ? null
          : undefined,
  };
}
