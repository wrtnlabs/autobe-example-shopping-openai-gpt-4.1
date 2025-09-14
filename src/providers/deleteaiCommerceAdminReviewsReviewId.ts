import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Logically delete a review by marking it as deleted (ai_commerce_reviews
 * table).
 *
 * This operation allows an authenticated admin to logically remove a review by
 * updating its deleted_at timestamp. Logically deleted reviews are unavailable
 * for standard queries, but retained for compliance, evidence, and audit
 * trail.
 *
 * - If the review does not exist or is already deleted (deleted_at is set), an
 *   error is thrown.
 * - Sets deleted_at to current date-time in ISO8601 format.
 *
 * @param props Object containing required parameters
 * @param props.admin The authenticated admin user performing deletion
 * @param props.reviewId The unique identifier of the review to be deleted
 * @returns Void
 * @throws {Error} When the review does not exist or is already deleted
 */
export async function deleteaiCommerceAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { reviewId } = props;
  // Step 1: Ensure review exists and is not already deleted
  const review = await MyGlobal.prisma.ai_commerce_reviews.findFirst({
    where: { id: reviewId, deleted_at: null },
    select: { id: true },
  });
  if (!review) {
    throw new Error("Review not found or already deleted.");
  }
  // Step 2: Mark as deleted using soft delete field
  await MyGlobal.prisma.ai_commerce_reviews.update({
    where: { id: reviewId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
