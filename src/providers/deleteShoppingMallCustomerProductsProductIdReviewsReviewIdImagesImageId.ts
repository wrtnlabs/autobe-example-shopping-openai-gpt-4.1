import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerProductsProductIdReviewsReviewIdImagesImageId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find review and check ownership and linkage
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (review === null) throw new HttpException("Review not found", 404);
  if (review.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("You are not the author of this review", 403);
  // Only allow deletion if review status is not pending/moderation/hidden/rejected (assume 'approved' is safe)
  if (review.status !== "approved")
    throw new HttpException(
      "Cannot delete image for review under moderation or locked state",
      403,
    );
  // 2. Find image and check linkage to the review
  const image = await MyGlobal.prisma.shopping_mall_review_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_review_id: props.reviewId,
    },
  });
  if (image === null) throw new HttpException("Image not found", 404);
  // 3. Hard delete the image
  await MyGlobal.prisma.shopping_mall_review_images.delete({
    where: {
      id: props.imageId,
    },
  });
  // 4. Audit log the deletion is not possible without an admin_id
  // Skipped because shopping_mall_admin_id is required in admin_action_logs schema, but only customers are present
  // (If storage/CDN removal needed, add here)
}
