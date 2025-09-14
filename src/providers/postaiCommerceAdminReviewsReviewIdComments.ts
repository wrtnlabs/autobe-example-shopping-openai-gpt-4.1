import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new comment on the specified review (ai_commerce_comments table).
 *
 * This operation allows an authenticated admin to create a new comment attached
 * to a specific review. The request body includes the comment's content,
 * optional parent comment ID for threading, visibility, and status. The
 * operation checks the existence and non-deletion of the target review before
 * posting the comment. Upon success, the comment is recorded in
 * ai_commerce_comments and returned in full IAiCommerceComment shape for
 * immediate use in UI. Audit and notification routines may be handled in other
 * layers.
 *
 * @param props - The parameters for comment creation
 * @param props.admin - The authenticated AdminPayload (must have global create
 *   permissions)
 * @param props.reviewId - The UUID of the review to attach the comment to
 * @param props.body - IAiCommerceComment.ICreate request body (content,
 *   optional parent ID, visibility, status)
 * @returns The newly created comment as IAiCommerceComment
 * @throws {Error} If the review is not found or is deleted
 */
export async function postaiCommerceAdminReviewsReviewIdComments(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { admin, reviewId, body } = props;

  // Ensure the review exists and is not deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new Error("Review not found or is deleted");
  }

  // Prepare fields
  const now = toISOStringSafe(new Date());
  const id = v4();

  // Create the comment on ai_commerce_comments
  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: id,
      author_id: admin.id,
      parent_comment_id: body.parent_comment_id ?? null,
      bulletin_id: null,
      inquiry_id: null,
      review_id: reviewId,
      body: body.body,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
    },
  });

  // Return IAiCommerceComment, mapping nullable fields with undefined if appropriate
  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: created.bulletin_id ?? undefined,
    inquiry_id: created.inquiry_id ?? undefined,
    review_id: created.review_id ?? undefined,
    body: created.body,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: created.deleted_at ?? undefined,
  };
}
