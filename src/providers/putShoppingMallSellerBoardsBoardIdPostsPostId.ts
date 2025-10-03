import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerBoardsBoardIdPostsPostId(props: {
  seller: SellerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IShoppingMallBoardPost.IUpdate;
}): Promise<IShoppingMallBoardPost> {
  // 1. Fetch the board post, ensure not deleted
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
  });
  if (!post) throw new HttpException("Board post not found", 404);
  // 2. Only author seller can update
  if (post.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Only the original seller can update this post",
      403,
    );
  }
  // 3. Create pre-update snapshot
  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: post.id,
      title: post.title ?? null,
      body: post.body,
      reply_level: post.reply_level,
      is_official_answer: post.is_official_answer,
      visibility: post.visibility,
      moderation_status: post.moderation_status,
      moderation_reason: post.moderation_reason ?? null,
      snapshot_reason: "before_edit",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 4. Update post fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: post.id },
    data: {
      title: props.body.title === undefined ? null : props.body.title,
      body: props.body.body,
      visibility: props.body.visibility ?? undefined,
      moderation_status: props.body.moderation_status ?? undefined,
      moderation_reason:
        props.body.moderation_reason === undefined
          ? null
          : props.body.moderation_reason,
      updated_at: now,
    },
  });
  // 5. Create post-update snapshot
  await MyGlobal.prisma.shopping_mall_board_post_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_board_post_id: updated.id,
      title: updated.title ?? null,
      body: updated.body,
      reply_level: updated.reply_level,
      is_official_answer: updated.is_official_answer,
      visibility: updated.visibility,
      moderation_status: updated.moderation_status,
      moderation_reason: updated.moderation_reason ?? null,
      snapshot_reason: "after_edit",
      created_at: now,
    },
  });
  // 6. Return the updated board post, formatting all date-times as required
  return {
    id: updated.id,
    shopping_mall_board_id: updated.shopping_mall_board_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    shopping_mall_parent_post_id:
      updated.shopping_mall_parent_post_id ?? undefined,
    shopping_mall_product_id: updated.shopping_mall_product_id ?? undefined,
    shopping_mall_order_id: updated.shopping_mall_order_id ?? undefined,
    title: updated.title ?? undefined,
    body: updated.body,
    reply_level: updated.reply_level,
    is_official_answer: updated.is_official_answer,
    visibility: updated.visibility,
    moderation_status: updated.moderation_status,
    moderation_reason: updated.moderation_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
