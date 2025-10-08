import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdReviewsReviewIdRepliesReplyId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReply.IUpdate;
}): Promise<IShoppingMallReviewReply> {
  const now = toISOStringSafe(new Date());
  // Find reply for this seller for exact review, not deleted
  const reply = await MyGlobal.prisma.shopping_mall_review_replies.findFirst({
    where: {
      id: props.replyId,
      shopping_mall_review_id: props.reviewId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!reply) {
    throw new HttpException(
      "Reply not found, deleted, or not owned by seller",
      404,
    );
  }
  // Fetch parent review to check productId
  const parentReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: reply.shopping_mall_review_id },
    select: { shopping_mall_product_id: true },
  });
  if (
    !parentReview ||
    parentReview.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException("Reply does not match this product", 404);
  }
  // Prepare update
  const updated = await MyGlobal.prisma.shopping_mall_review_replies.update({
    where: { id: props.replyId },
    data: {
      body: props.body.body ?? undefined,
      status: props.body.status ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    reviewId: updated.shopping_mall_review_id,
    productId: parentReview.shopping_mall_product_id,
    sellerId: updated.shopping_mall_seller_id ?? undefined,
    adminId: updated.shopping_mall_admin_id ?? undefined,
    body: updated.body,
    status: updated.status === "public" ? "public" : "hidden",
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
