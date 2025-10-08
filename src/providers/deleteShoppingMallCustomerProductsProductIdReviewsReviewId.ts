import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch review and validate ownership/product/soft deletion status
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_product_id: true,
      deleted_at: true,
      status: true,
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  // Only review author can erase
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: Only the author can delete this review",
      403,
    );
  }
  // Review must be for provided product
  if (review.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Review does not belong to the specified product",
      404,
    );
  }
  // Already deleted cannot delete again
  if (review.deleted_at !== null) {
    throw new HttpException("Review already deleted", 400);
  }
  // Optionally lock on status (if needed by business, skipped here)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: { deleted_at: now },
  });
  // Infra: Log action, invalidate aggregate, admin notification if needed (omitted in code)
}
