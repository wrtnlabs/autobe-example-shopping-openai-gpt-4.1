import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Find review by id (must not be deleted)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found or already deleted", 404);
  }

  // 2. Authorization: Only author may delete (customer)
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Only author may delete this review",
      403,
    );
  }

  // 3. Soft delete review (set deleted_at, updated_at)
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // 4. Snapshot before deletion (entity_type: 'review', entity_id: reviewId)
  await MyGlobal.prisma.shopping_mall_entity_snapshots.create({
    data: {
      id: v4(),
      entity_type: "review",
      entity_id: props.reviewId,
      snapshot_reason: "delete",
      snapshot_actor_id: props.customer.id,
      snapshot_data: JSON.stringify(review),
      event_time: now,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Record deletion event
  await MyGlobal.prisma.shopping_mall_deletion_events.create({
    data: {
      id: v4(),
      entity_type: "review",
      entity_id: props.reviewId,
      deleted_by_id: props.customer.id,
      deletion_reason: "author_deleted",
      deleted_at: now,
      created_at: now,
    },
  });
}
