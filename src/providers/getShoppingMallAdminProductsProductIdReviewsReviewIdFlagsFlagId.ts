import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdReviewsReviewIdFlagsFlagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewFlag> {
  const flag = await MyGlobal.prisma.shopping_mall_review_flags.findUnique({
    where: { id: props.flagId },
  });
  if (!flag) {
    throw new HttpException("Flag not found", 404);
  }
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: flag.shopping_mall_review_id },
  });
  if (
    !review ||
    review.id !== props.reviewId ||
    review.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Flag not found or mismatched product/review context",
      404,
    );
  }
  return {
    id: flag.id,
    shopping_mall_review_id: flag.shopping_mall_review_id,
    shopping_mall_customer_id: flag.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: flag.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: flag.shopping_mall_admin_id ?? undefined,
    reason: flag.reason,
    note: flag.note ?? undefined,
    status: flag.status,
    created_at: toISOStringSafe(flag.created_at),
    updated_at: toISOStringSafe(flag.updated_at),
  };
}
