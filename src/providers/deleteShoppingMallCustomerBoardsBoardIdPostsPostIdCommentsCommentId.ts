import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerBoardsBoardIdPostsPostIdCommentsCommentId(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, boardId, postId, commentId } = props;

  // Fetch the comment and basic info
  const comment = await MyGlobal.prisma.shopping_mall_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
      shopping_mall_board_post_id: postId,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_board_post_id: true,
    },
  });

  if (!comment || comment.shopping_mall_board_post_id == null) {
    throw new HttpException("댓글을 찾을 수 없거나 이미 삭제되었습니다.", 404);
  }

  // Verify that the comment's post exists and is on the correct board and not deleted
  const boardPost = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: comment.shopping_mall_board_post_id,
      shopping_mall_board_id: boardId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!boardPost) {
    throw new HttpException(
      "게시글을 찾을 수 없거나 이미 삭제되었습니다.",
      404,
    );
  }

  if (comment.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("본인 댓글만 삭제할 수 있습니다.", 403);
  }

  await MyGlobal.prisma.shopping_mall_comments.update({
    where: { id: commentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
