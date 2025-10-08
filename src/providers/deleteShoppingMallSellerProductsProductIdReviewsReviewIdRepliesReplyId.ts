import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdReviewsReviewIdRepliesReplyId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the reply, ensure it belongs to this seller, that it matches the supplied reviewId, and is not already deleted.
  const reply = await MyGlobal.prisma.shopping_mall_review_replies.findFirst({
    where: {
      id: props.replyId,
      shopping_mall_review_id: props.reviewId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!reply) {
    throw new HttpException("Reply not found or not owned by this seller", 404);
  }
  // Step 2: Hard delete (permanently remove from DB)
  await MyGlobal.prisma.shopping_mall_review_replies.delete({
    where: { id: props.replyId },
  });
  // (Optional) Step 3: Create moderation/audit log, if needed (not implemented here; outside core spec)
}
