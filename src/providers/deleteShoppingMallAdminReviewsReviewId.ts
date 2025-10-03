import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find review (not deleted)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException("Review not found or already deleted", 404);
  }

  // Step 2: Soft delete
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Step 3: Create snapshot
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      moderation_status: review.moderation_status,
      notified_at: review.notified_at
        ? toISOStringSafe(review.notified_at)
        : null,
      snapshot_reason: "deleted",
      created_at: now,
    },
  });

  // Step 4: Register deletion event
  await MyGlobal.prisma.shopping_mall_deletion_events.create({
    data: {
      id: v4(),
      entity_type: "review",
      entity_id: props.reviewId,
      deleted_by_id: props.admin.id,
      deletion_reason: "admin_deleted",
      snapshot_id: null,
      deleted_at: now,
      created_at: now,
    },
  });
}
