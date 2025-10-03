import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminBoardsBoardIdPostsPostId(props: {
  admin: AdminPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IShoppingMallBoardPost.IUpdate;
}): Promise<IShoppingMallBoardPost> {
  // Board existence and not deleted
  const board = await MyGlobal.prisma.shopping_mall_boards.findUnique({
    where: { id: props.boardId },
  });
  if (!board || board.deleted_at !== null) {
    throw new HttpException("Board not found or deleted", 404);
  }

  // Post existence, not deleted, matches board
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findUnique({
    where: { id: props.postId },
  });
  if (
    !post ||
    post.deleted_at !== null ||
    post.shopping_mall_board_id !== props.boardId
  ) {
    throw new HttpException("Post not found in board or deleted", 404);
  }

  // Only admin is allowed by this endpoint
  // Write pre-update snapshot
  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: post.id,
      title:
        post.title === null || post.title === undefined
          ? undefined
          : post.title,
      body: post.body,
      reply_level: post.reply_level,
      is_official_answer: post.is_official_answer,
      visibility: post.visibility,
      moderation_status: post.moderation_status,
      moderation_reason:
        post.moderation_reason === null || post.moderation_reason === undefined
          ? undefined
          : post.moderation_reason,
      snapshot_reason: "pre-update",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Prepare update fields (only allowed mutable fields)
  const updateFields: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (Object.prototype.hasOwnProperty.call(props.body, "title")) {
    updateFields.title = props.body.title;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "body")) {
    updateFields.body = props.body.body;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "visibility")) {
    updateFields.visibility = props.body.visibility;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "moderation_status")) {
    updateFields.moderation_status = props.body.moderation_status;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "moderation_reason")) {
    updateFields.moderation_reason = props.body.moderation_reason;
  }

  // Perform update
  const updated = await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: props.postId },
    data: updateFields,
  });

  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: updated.id,
      title:
        updated.title === null || updated.title === undefined
          ? undefined
          : updated.title,
      body: updated.body,
      reply_level: updated.reply_level,
      is_official_answer: updated.is_official_answer,
      visibility: updated.visibility,
      moderation_status: updated.moderation_status,
      moderation_reason:
        updated.moderation_reason === null ||
        updated.moderation_reason === undefined
          ? undefined
          : updated.moderation_reason,
      snapshot_reason: "post-update",
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_board_id: updated.shopping_mall_board_id,
    shopping_mall_customer_id:
      updated.shopping_mall_customer_id === null ||
      updated.shopping_mall_customer_id === undefined
        ? undefined
        : updated.shopping_mall_customer_id,
    shopping_mall_seller_id:
      updated.shopping_mall_seller_id === null ||
      updated.shopping_mall_seller_id === undefined
        ? undefined
        : updated.shopping_mall_seller_id,
    shopping_mall_admin_id:
      updated.shopping_mall_admin_id === null ||
      updated.shopping_mall_admin_id === undefined
        ? undefined
        : updated.shopping_mall_admin_id,
    shopping_mall_parent_post_id:
      updated.shopping_mall_parent_post_id === null ||
      updated.shopping_mall_parent_post_id === undefined
        ? undefined
        : updated.shopping_mall_parent_post_id,
    shopping_mall_product_id:
      updated.shopping_mall_product_id === null ||
      updated.shopping_mall_product_id === undefined
        ? undefined
        : updated.shopping_mall_product_id,
    shopping_mall_order_id:
      updated.shopping_mall_order_id === null ||
      updated.shopping_mall_order_id === undefined
        ? undefined
        : updated.shopping_mall_order_id,
    title:
      updated.title === null || updated.title === undefined
        ? undefined
        : updated.title,
    body: updated.body,
    reply_level: updated.reply_level,
    is_official_answer: updated.is_official_answer,
    visibility: updated.visibility,
    moderation_status: updated.moderation_status,
    moderation_reason:
      updated.moderation_reason === null ||
      updated.moderation_reason === undefined
        ? undefined
        : updated.moderation_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
