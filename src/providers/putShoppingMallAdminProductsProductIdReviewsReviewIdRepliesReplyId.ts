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

export async function putShoppingMallAdminProductsProductIdReviewsReviewIdRepliesReplyId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewReply.IUpdate;
}): Promise<IShoppingMallReviewReply> {
  const now = toISOStringSafe(new Date());

  // 1. Fetch reply and check ownership / deletion
  const found = await MyGlobal.prisma.shopping_mall_review_replies.findUnique({
    where: { id: props.replyId },
    select: {
      id: true,
      shopping_mall_review_id: true,
      shopping_mall_admin_id: true,
      shopping_mall_seller_id: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!found || found.shopping_mall_review_id !== props.reviewId) {
    throw new HttpException("Reply not found for given product/review.", 404);
  }
  if (found.deleted_at) {
    throw new HttpException("Reply has been deleted.", 404);
  }
  if (found.shopping_mall_admin_id !== props.admin.id) {
    throw new HttpException("You are not the author of this reply.", 403);
  }

  // 2. Update reply: only body/status if present in props.body
  const updated = await MyGlobal.prisma.shopping_mall_review_replies.update({
    where: { id: props.replyId },
    data: {
      body: props.body.body ?? undefined,
      status: props.body.status ?? undefined,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_review_id: true,
      shopping_mall_admin_id: true,
      shopping_mall_seller_id: true,
      body: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    reviewId: updated.shopping_mall_review_id,
    productId: props.productId,
    sellerId: updated.shopping_mall_seller_id ?? undefined,
    adminId: updated.shopping_mall_admin_id ?? undefined,
    body: updated.body,
    status: updated.status as "public" | "hidden",
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
