import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Step 1: Fetch review by id, ensure it exists
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Step 2: Authorization (must be review owner)
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You are not the author of this review", 403);
  }

  // Step 3: Check not deleted (soft delete)
  if (review.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted review", 400);
  }

  // Step 4: Prepare update fields (no as, always inline)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      rating: props.body.rating !== undefined ? props.body.rating : undefined,
      title: props.body.title !== undefined ? props.body.title : undefined,
      body: props.body.body !== undefined ? props.body.body : undefined,
      moderation_status:
        props.body.moderation_status !== undefined
          ? props.body.moderation_status
          : undefined,
      notified_at:
        props.body.notified_at !== undefined
          ? props.body.notified_at
          : undefined,
      updated_at: now,
    },
  });

  // Step 5: Format and return API response with correct null/undefined mapping
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null
        ? undefined
        : updated.shopping_mall_seller_id,
    rating: updated.rating,
    title: updated.title === null ? undefined : updated.title,
    body: updated.body,
    moderation_status: updated.moderation_status,
    notified_at:
      updated.notified_at === null
        ? undefined
        : toISOStringSafe(updated.notified_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
