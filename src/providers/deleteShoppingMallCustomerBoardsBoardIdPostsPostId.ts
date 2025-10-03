import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerBoardsBoardIdPostsPostId(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the post, ensure it's not already deleted and belongs to the given board
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found or already deleted", 404);
  }
  if (post.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You are not the author of this post.", 403);
  }

  await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
