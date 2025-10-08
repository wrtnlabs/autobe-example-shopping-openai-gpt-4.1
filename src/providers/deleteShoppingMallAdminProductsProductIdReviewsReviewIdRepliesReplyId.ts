import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdReviewsReviewIdRepliesReplyId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the reply exists and is associated with the correct review and product
  const reply = await MyGlobal.prisma.shopping_mall_review_replies.findFirst({
    where: {
      id: props.replyId,
      shopping_mall_review_id: props.reviewId,
      deleted_at: null,
      review: {
        shopping_mall_product_id: props.productId,
      },
    },
  });
  if (reply === null) {
    throw new HttpException("Reply not found", 404);
  }
  // Step 2: Hard delete the reply
  await MyGlobal.prisma.shopping_mall_review_replies.delete({
    where: { id: props.replyId },
  });
}
