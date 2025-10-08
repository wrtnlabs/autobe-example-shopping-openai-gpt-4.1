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

export async function putShoppingMallAdminProductsProductIdReviewsReviewIdFlagsFlagId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.IUpdate;
}): Promise<IShoppingMallReviewFlag> {
  // Step 1: Lookup flag (by id/reviewId)
  const flag = await MyGlobal.prisma.shopping_mall_review_flags.findUnique({
    where: {
      id: props.flagId,
    },
  });
  if (!flag || flag.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException(
      "Review flag not found for specified product/review.",
      404,
    );
  }
  // Step 2: Lookup review and check product linkage
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: {
      id: props.reviewId,
    },
  });
  if (!review || review.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Review not found for product.", 404);
  }
  // Step 3: Business rule - only allow update if flag is not closed
  if (flag.status !== "open") {
    throw new HttpException(
      "Cannot update closed review flag (already resolved or rejected).",
      409,
    );
  }
  // Step 4: Update the flag
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_review_flags.update({
    where: { id: props.flagId },
    data: {
      note: Object.prototype.hasOwnProperty.call(props.body, "note")
        ? props.body.note
        : undefined,
      status: props.body.status,
      updated_at: now,
    },
  });
  // Step 5: Return API DTO
  return {
    id: updated.id,
    shopping_mall_review_id: updated.shopping_mall_review_id,
    shopping_mall_customer_id:
      typeof updated.shopping_mall_customer_id === "string"
        ? updated.shopping_mall_customer_id
        : undefined,
    shopping_mall_seller_id:
      typeof updated.shopping_mall_seller_id === "string"
        ? updated.shopping_mall_seller_id
        : undefined,
    shopping_mall_admin_id:
      typeof updated.shopping_mall_admin_id === "string"
        ? updated.shopping_mall_admin_id
        : undefined,
    reason: updated.reason,
    note: typeof updated.note === "string" ? updated.note : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
