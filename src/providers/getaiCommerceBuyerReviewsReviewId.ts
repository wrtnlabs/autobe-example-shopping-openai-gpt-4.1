import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detail of a specific review (ai_commerce_reviews).
 *
 * Fetches a single review by reviewId. Allows only the buyer who authored the
 * review to access it. Returns all review detail fields, converting
 * date/datetime to string format and handling nullable fields safely.
 *
 * @param props - The props for the operation
 * @param props.buyer - The authenticated BuyerPayload (author of the review)
 * @param props.reviewId - UUID of the review to retrieve
 * @returns The complete IAiCommerceReview object for the review
 * @throws {Error} If the review does not exist or is soft-deleted
 * @throws {Error} If the auth buyer does not match the review author
 */
export async function getaiCommerceBuyerReviewsReviewId(props: {
  buyer: BuyerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceReview> {
  const { buyer, reviewId } = props;

  const review = await MyGlobal.prisma.ai_commerce_reviews.findUnique({
    where: {
      id: reviewId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_id: true,
      order_item_id: true,
      rating: true,
      body: true,
      seller_response: true,
      visibility: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.author_id !== buyer.id) {
    throw new Error("Forbidden: You can only access your reviews");
  }

  return {
    id: review.id,
    author_id: review.author_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    body: review.body,
    seller_response:
      review.seller_response === null ? undefined : review.seller_response,
    visibility: review.visibility,
    status: review.status,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at:
      review.deleted_at === null
        ? undefined
        : toISOStringSafe(review.deleted_at),
  };
}
