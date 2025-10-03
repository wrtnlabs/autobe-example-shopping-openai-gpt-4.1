import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerBoardsBoardIdPostsPostId(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IShoppingMallBoardPost.IUpdate;
}): Promise<IShoppingMallBoardPost> {
  // 1. Find the post (by PK, board, not deleted)
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
  });
  if (!post)
    throw new HttpException("게시글이 존재하지 않거나 삭제되었습니다.", 404);

  // 2. Check ownership (customer must match)
  if (post.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("본인의 게시글만 수정할 수 있습니다.", 403);

  // 3. Record pre-update snapshot
  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: post.id,
      title: post.title === undefined ? null : post.title,
      body: post.body,
      reply_level: post.reply_level,
      is_official_answer: post.is_official_answer,
      visibility: post.visibility,
      moderation_status: post.moderation_status,
      moderation_reason:
        post.moderation_reason === undefined ? null : post.moderation_reason,
      snapshot_reason: "pre-update",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Update fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title === undefined ? undefined : props.body.title,
      body: props.body.body,
      visibility:
        props.body.visibility === undefined ? undefined : props.body.visibility,
      moderation_status:
        props.body.moderation_status === undefined
          ? undefined
          : props.body.moderation_status,
      moderation_reason:
        props.body.moderation_reason === undefined
          ? undefined
          : props.body.moderation_reason,
      updated_at: now,
    },
  });

  // 5. Record post-update snapshot
  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: updated.id,
      title: updated.title === undefined ? null : updated.title,
      body: updated.body,
      reply_level: updated.reply_level,
      is_official_answer: updated.is_official_answer,
      visibility: updated.visibility,
      moderation_status: updated.moderation_status,
      moderation_reason:
        updated.moderation_reason === undefined
          ? null
          : updated.moderation_reason,
      snapshot_reason: "post-update",
      created_at: now,
    },
  });

  // 6. Return full post object mapped to DTO
  return {
    id: updated.id,
    shopping_mall_board_id: updated.shopping_mall_board_id,
    shopping_mall_customer_id:
      updated.shopping_mall_customer_id === null
        ? undefined
        : updated.shopping_mall_customer_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null
        ? undefined
        : updated.shopping_mall_seller_id,
    shopping_mall_admin_id:
      updated.shopping_mall_admin_id === null
        ? undefined
        : updated.shopping_mall_admin_id,
    shopping_mall_parent_post_id:
      updated.shopping_mall_parent_post_id === null
        ? undefined
        : updated.shopping_mall_parent_post_id,
    shopping_mall_product_id:
      updated.shopping_mall_product_id === null
        ? undefined
        : updated.shopping_mall_product_id,
    shopping_mall_order_id:
      updated.shopping_mall_order_id === null
        ? undefined
        : updated.shopping_mall_order_id,
    title: updated.title == null ? undefined : updated.title,
    body: updated.body,
    reply_level: updated.reply_level,
    is_official_answer: updated.is_official_answer,
    visibility: updated.visibility,
    moderation_status: updated.moderation_status,
    moderation_reason:
      updated.moderation_reason == null ? undefined : updated.moderation_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
