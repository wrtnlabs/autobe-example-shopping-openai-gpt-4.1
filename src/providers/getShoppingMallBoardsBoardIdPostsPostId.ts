import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";

export async function getShoppingMallBoardsBoardIdPostsPostId(props: {
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBoardPost> {
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  return {
    id: post.id,
    shopping_mall_board_id: post.shopping_mall_board_id,
    shopping_mall_customer_id: post.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: post.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: post.shopping_mall_admin_id ?? undefined,
    shopping_mall_parent_post_id:
      post.shopping_mall_parent_post_id ?? undefined,
    shopping_mall_product_id: post.shopping_mall_product_id ?? undefined,
    shopping_mall_order_id: post.shopping_mall_order_id ?? undefined,
    title: post.title ?? undefined,
    body: post.body,
    reply_level: post.reply_level,
    is_official_answer: post.is_official_answer,
    visibility: post.visibility,
    moderation_status: post.moderation_status,
    moderation_reason: post.moderation_reason ?? undefined,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
  };
}
