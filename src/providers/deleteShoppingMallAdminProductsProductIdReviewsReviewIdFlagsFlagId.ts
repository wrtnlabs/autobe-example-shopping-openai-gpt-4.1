import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdReviewsReviewIdFlagsFlagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { flagId, reviewId, productId } = props;

  // 1. Ensure flag exists for the given reviewId and flagId
  const flag = await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
    where: {
      id: flagId,
      shopping_mall_review_id: reviewId,
    },
  });
  if (!flag) {
    throw new HttpException(
      "Review flag not found for the given reviewId and flagId.",
      404,
    );
  }
  // 2. Fetch review and check if it belongs to the specified product
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: {
      id: reviewId,
    },
    select: {
      shopping_mall_product_id: true,
    },
  });
  if (!review || review.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Review does not belong to the given product.",
      404,
    );
  }
  // 3. Hard delete (no soft delete field)
  await MyGlobal.prisma.shopping_mall_review_flags.delete({
    where: {
      id: flagId,
    },
  });
}
