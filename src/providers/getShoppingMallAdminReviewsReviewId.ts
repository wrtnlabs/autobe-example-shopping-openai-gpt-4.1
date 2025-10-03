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

export async function getShoppingMallAdminReviewsReviewId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review || review.deleted_at) {
    throw new HttpException("Review not found", 404);
  }
  return {
    id: review.id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_seller_id:
      review.shopping_mall_seller_id === null
        ? undefined
        : review.shopping_mall_seller_id,
    rating: review.rating,
    title: review.title === null ? undefined : review.title,
    body: review.body,
    moderation_status: review.moderation_status,
    notified_at:
      review.notified_at === null ? null : toISOStringSafe(review.notified_at),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at:
      review.deleted_at === null
        ? undefined
        : toISOStringSafe(review.deleted_at),
  };
}
