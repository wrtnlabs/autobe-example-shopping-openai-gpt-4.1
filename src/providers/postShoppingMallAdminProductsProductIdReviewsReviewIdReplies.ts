import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdReviewsReviewIdReplies(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReply.ICreate;
}): Promise<IShoppingMallReviewReply> {
  // Step 1: Confirm the review exists and is for the right product (joins productId and reviewId).
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!review)
    throw new HttpException("Review not found for this product", 404);

  // Step 2: Check for unique admin reply (unique on reviewId + adminId)
  const existingReply =
    await MyGlobal.prisma.shopping_mall_review_replies.findFirst({
      where: {
        shopping_mall_review_id: props.reviewId,
        shopping_mall_admin_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (existingReply)
    throw new HttpException("Admin has already replied to this review", 409);

  // Step 3: Insert reply as admin
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_review_replies.create({
    data: {
      id: v4(),
      shopping_mall_review_id: props.reviewId,
      shopping_mall_admin_id: props.admin.id,
      shopping_mall_seller_id: null,
      body: props.body.body,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 4: Format and return IShoppingMallReviewReply
  return {
    id: created.id,
    reviewId: created.shopping_mall_review_id,
    productId: props.productId,
    adminId: created.shopping_mall_admin_id,
    sellerId: null,
    body: created.body,
    status: created.status as "public" | "hidden",
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
