import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detail of a specific review (ai_commerce_reviews).
 *
 * Fetches a single review from ai_commerce_reviews using the provided reviewId.
 * Enforces permission based on admin role. Returns review details including
 * author, rating, body, seller response, timestamps, and status. If the review
 * does not exist, throws an error. Handles all date fields as branded ISO
 * strings, with null/undefined handling according to the IAiCommerceReview DTO
 * contract.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated system administrator performing this
 *   request
 * @param props.reviewId - UUID of the review to retrieve
 * @returns The full details of the specified review, matching the
 *   IAiCommerceReview interface
 * @throws {Error} If the review does not exist
 */
export async function getaiCommerceAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceReview> {
  const review = await MyGlobal.prisma.ai_commerce_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
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

  // Build return object matching IAiCommerceReview
  const result: IAiCommerceReview = {
    id: review.id,
    author_id: review.author_id,
    order_item_id: review.order_item_id,
    rating: review.rating,
    body: review.body,
    visibility: review.visibility,
    status: review.status,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    ...(review.seller_response !== null && {
      seller_response: review.seller_response,
    }),
    ...(review.deleted_at !== null && {
      deleted_at: toISOStringSafe(review.deleted_at),
    }),
  };
  return result;
}
