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

export async function postShoppingMallAdminProductsProductIdReviewsReviewIdFlags(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewFlag.ICreate;
}): Promise<IShoppingMallReviewFlag> {
  // Step 1: Validate review exists, is not deleted, and belongs to product
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException("Review not found or deleted", 404);
  }

  // Step 2: Check for duplicate 'open' flag by same admin for same review
  const existingFlag =
    await MyGlobal.prisma.shopping_mall_review_flags.findFirst({
      where: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_admin_id: props.admin.id,
        status: "open",
      },
    });
  if (existingFlag) {
    throw new HttpException(
      "You have already flagged this review (open flag exists)",
      409,
    );
  }

  // Step 3: Insert flag record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_review_flags.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      shopping_mall_customer_id: null,
      shopping_mall_seller_id: null,
      shopping_mall_admin_id: props.admin.id,
      reason: props.body.reason,
      note: props.body.note ?? null,
      status: "open",
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Return DTO-matching object (no type assertions, all date fields as ISO)
  return {
    id: created.id,
    shopping_mall_review_id: created.shopping_mall_review_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: created.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: created.shopping_mall_admin_id ?? undefined,
    reason: created.reason,
    note: created.note ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
