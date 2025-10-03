import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerBoardsBoardIdPostsPostIdComments(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IShoppingMallComment.ICreate;
}): Promise<IShoppingMallComment> {
  // Validate referenced board exists and is not deleted
  const board = await MyGlobal.prisma.shopping_mall_boards.findUnique({
    where: { id: props.boardId, deleted_at: null },
  });
  if (!board) {
    throw new HttpException("Board not found or deleted", 404);
  }

  // Validate referenced post exists and is not deleted, and attached to board
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });
  if (!post || post.shopping_mall_board_id !== props.boardId) {
    throw new HttpException(
      "Post not found, deleted, or does not belong to this board",
      404,
    );
  }

  // Determine comment level and validate parent if provided
  let level = 0;
  if (props.body.shopping_mall_parent_comment_id) {
    const parent = await MyGlobal.prisma.shopping_mall_comments.findUnique({
      where: {
        id: props.body.shopping_mall_parent_comment_id,
        deleted_at: null,
      },
    });
    if (!parent || parent.shopping_mall_board_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        404,
      );
    }
    level = parent.level + 1;
  }

  // Set moderation_status from board.moderation_required (true = pending, false = approved)
  const moderation_status = board.moderation_required ? "pending" : "approved";
  const now = toISOStringSafe(new Date());
  const commentId = v4();

  // Create comment
  const created = await MyGlobal.prisma.shopping_mall_comments.create({
    data: {
      id: commentId,
      shopping_mall_board_post_id: props.postId,
      shopping_mall_parent_comment_id:
        props.body.shopping_mall_parent_comment_id ?? undefined,
      shopping_mall_customer_id: props.customer.id,
      body: props.body.body,
      level: level,
      moderation_status: moderation_status,
      created_at: now,
      updated_at: now,
    },
  });

  // Return as IShoppingMallComment, mapping all optional/nullable fields properly
  return {
    id: created.id,
    shopping_mall_board_post_id:
      created.shopping_mall_board_post_id ?? undefined,
    shopping_mall_product_inquiry_id: undefined,
    shopping_mall_review_id: undefined,
    shopping_mall_parent_comment_id:
      created.shopping_mall_parent_comment_id ?? undefined,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: undefined,
    shopping_mall_admin_id: undefined,
    body: created.body,
    level: created.level,
    moderation_status: created.moderation_status,
    moderation_reason: created.moderation_reason ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
