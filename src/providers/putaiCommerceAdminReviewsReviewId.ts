import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the content, rating, or seller response of a review
 * (ai_commerce_reviews table).
 *
 * This operation allows an admin to update an existing review. It supports
 * editing the review's content, numeric rating, visibility, status, and the
 * optional seller response. Only reviews that exist and have not been
 * soft-deleted can be updated. Audit, history, and compliance snapshots are
 * handled by system triggers; this function only performs the review update
 * itself.
 *
 * Authorization as an active admin is enforced upstream (via AdminPayload). If
 * the review does not exist or has been deleted, an error is thrown.
 *
 * All datetime values are output as ISO 8601 strings with correct type
 * branding. No use of native Date type or `as` type assertions anywhere in this
 * implementation.
 *
 * @param props - Properties for the update operation
 * @param props.admin - Authenticated admin (authorization checked upstream)
 * @param props.reviewId - UUID of the review to be updated
 * @param props.body - Review update payload (fields to change)
 * @returns Updated review object after changes are applied
 * @throws {Error} If the review is not found or has been deleted
 */
export async function putaiCommerceAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IAiCommerceReview.IUpdate;
}): Promise<IAiCommerceReview> {
  const { reviewId, body } = props;
  // 1. Find the review (non-deleted only)
  const reviewRecord = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: {
      id: reviewId,
      deleted_at: null,
    },
  });
  if (!reviewRecord) {
    throw new Error("Review not found");
  }

  // 2. Build update data with only present fields
  const updateData = {
    ...(body.rating !== undefined && { rating: body.rating }),
    ...(body.body !== undefined && { body: body.body }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.seller_response !== undefined && {
      seller_response: body.seller_response,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Update the review and retrieve all fields
  const updated = await MyGlobal.prisma.ai_commerce_reviews.update({
    where: { id: reviewId },
    data: updateData,
  });

  // 4. Construct return object matching IAiCommerceReview
  return {
    id: updated.id,
    author_id: updated.author_id,
    order_item_id: updated.order_item_id,
    rating: updated.rating,
    body: updated.body,
    seller_response: updated.seller_response ?? undefined,
    visibility: updated.visibility,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
