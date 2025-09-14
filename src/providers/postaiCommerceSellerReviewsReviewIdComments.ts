import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new comment on the specified review (ai_commerce_comments table).
 *
 * This function allows an authenticated seller to create a new comment on a
 * review as either a first-level or reply comment. It validates that the review
 * exists, then creates the new comment attached to the specified review. The
 * implementation matches the ai_commerce_comments model and the
 * IAiCommerceComment contract with strict schema, type, and value
 * correspondence. All timestamp fields use the required branded ISO-string
 * format, and the function generates a UUID for the new comment id. Returns the
 * new comment entity for UI rendering.
 *
 * @param props - Parameters for this operation
 * @param props.seller - The authenticated seller (from JWT)
 * @param props.reviewId - UUID of the review to which the comment is attached
 * @param props.body - IAiCommerceComment.ICreate with comment body, optional
 *   parentId for threading, and optional status
 * @returns The IAiCommerceComment entity created and persisted
 * @throws {Error} If the review with the given ID does not exist
 */
export async function postaiCommerceSellerReviewsReviewIdComments(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.ICreate;
}): Promise<IAiCommerceComment> {
  const { seller, reviewId, body } = props;
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: { id: reviewId },
  });
  if (!review) {
    throw new Error("Review not found");
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_id: seller.id,
      review_id: reviewId,
      parent_comment_id: body.parent_comment_id ?? undefined,
      body: body.body,
      status: body.status ?? "published",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    author_id: created.author_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    bulletin_id: created.bulletin_id ?? undefined,
    inquiry_id: created.inquiry_id ?? undefined,
    review_id: created.review_id ?? undefined,
    body: created.body,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
