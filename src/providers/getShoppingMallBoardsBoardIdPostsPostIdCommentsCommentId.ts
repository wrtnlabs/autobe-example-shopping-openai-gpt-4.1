import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComment";

export async function getShoppingMallBoardsBoardIdPostsPostIdCommentsCommentId(props: {
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallComment> {
  // 1. Ensure the board post exists and is not deleted, and belongs to the correct board
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!post) throw new HttpException("Comment not found", 404);

  // 2. Find the comment itself by ID and belonging to the validated post
  const comment = await MyGlobal.prisma.shopping_mall_comments.findFirst({
    where: {
      id: props.commentId,
      shopping_mall_board_post_id: props.postId,
      deleted_at: null,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);

  return {
    id: comment.id,
    shopping_mall_board_post_id:
      comment.shopping_mall_board_post_id ?? undefined,
    shopping_mall_product_inquiry_id:
      comment.shopping_mall_product_inquiry_id ?? undefined,
    shopping_mall_review_id: comment.shopping_mall_review_id ?? undefined,
    shopping_mall_parent_comment_id:
      comment.shopping_mall_parent_comment_id ?? undefined,
    shopping_mall_customer_id: comment.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: comment.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: comment.shopping_mall_admin_id ?? undefined,
    body: comment.body,
    level: comment.level,
    moderation_status: comment.moderation_status,
    moderation_reason: comment.moderation_reason ?? undefined,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
