import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerReviewsReviewId(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const { seller, reviewId } = props;
  // 1. Fetch review by id (must not be deleted)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: reviewId },
  });
  if (!review || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // 2. Fetch product for this review
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: review.shopping_mall_product_id },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Associated product not found", 404);
  }
  // 3. Ensure this seller owns the product
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: seller does not own this product's review",
      403,
    );
  }
  // 4. Assemble DTO with strict type rules (no as, all strings, use toISOStringSafe)
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
      review.deleted_at === null ? null : toISOStringSafe(review.deleted_at),
  };
}
