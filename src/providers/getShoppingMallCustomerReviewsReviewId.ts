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

export async function getShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only view your own reviews",
      403,
    );
  }

  return {
    id: review.id,
    shopping_mall_product_id: review.shopping_mall_product_id,
    shopping_mall_order_id: review.shopping_mall_order_id,
    shopping_mall_customer_id: review.shopping_mall_customer_id,
    shopping_mall_seller_id: review.shopping_mall_seller_id ?? undefined,
    rating: review.rating,
    title: review.title ?? undefined,
    body: review.body,
    moderation_status: review.moderation_status,
    notified_at:
      review.notified_at == null ? null : toISOStringSafe(review.notified_at),
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at:
      review.deleted_at == null ? null : toISOStringSafe(review.deleted_at),
  };
}
