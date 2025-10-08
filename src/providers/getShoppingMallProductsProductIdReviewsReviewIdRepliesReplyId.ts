import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

export async function getShoppingMallProductsProductIdReviewsReviewIdRepliesReplyId(props: {
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReviewReply> {
  const reply = await MyGlobal.prisma.shopping_mall_review_replies.findUnique({
    where: { id: props.replyId },
    include: {
      review: true,
    },
  });
  if (!reply || !reply.review) throw new HttpException("Reply not found", 404);
  if (
    reply.shopping_mall_review_id !== props.reviewId ||
    reply.review.shopping_mall_product_id !== props.productId
  ) {
    throw new HttpException(
      "Reply does not belong to specified review/product",
      404,
    );
  }
  if (reply.status !== "public" || reply.deleted_at !== null) {
    throw new HttpException("Reply is not public or has been deleted", 404);
  }
  return {
    id: reply.id,
    reviewId: reply.shopping_mall_review_id,
    productId: reply.review.shopping_mall_product_id,
    sellerId: reply.shopping_mall_seller_id ?? undefined,
    adminId: reply.shopping_mall_admin_id ?? undefined,
    body: reply.body,
    status: reply.status,
    createdAt: toISOStringSafe(reply.created_at),
    updatedAt: toISOStringSafe(reply.updated_at),
    deletedAt: reply.deleted_at ?? undefined,
  };
}
