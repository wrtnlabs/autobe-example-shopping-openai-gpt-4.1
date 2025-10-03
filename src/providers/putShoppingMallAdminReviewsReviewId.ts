import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Find the review (must exist and not deleted)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.deleted_at) {
    throw new HttpException("Review is deleted", 404);
  }

  // Prepare update payload (only patch fields provided)
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating ?? undefined,
      title: props.body.title ?? undefined,
      body: props.body.body ?? undefined,
      moderation_status: props.body.moderation_status ?? undefined,
      notified_at:
        props.body.notified_at !== undefined
          ? props.body.notified_at
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create snapshot for audit (required after every review update)
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_review_id: updated.id,
      rating: updated.rating,
      title: updated.title ?? null,
      body: updated.body,
      moderation_status: updated.moderation_status,
      notified_at: updated.notified_at
        ? toISOStringSafe(updated.notified_at)
        : null,
      snapshot_reason: "admin_review_update",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated review (all fields, correct null/undef handling, all dates toISOStringSafe)
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    rating: updated.rating,
    title: updated.title ?? undefined,
    body: updated.body,
    moderation_status: updated.moderation_status,
    notified_at: updated.notified_at
      ? toISOStringSafe(updated.notified_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
