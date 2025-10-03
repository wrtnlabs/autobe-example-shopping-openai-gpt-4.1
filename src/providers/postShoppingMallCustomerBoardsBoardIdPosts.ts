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

export async function postShoppingMallCustomerBoardsBoardIdPosts(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  body: IShoppingMallBoardPost.ICreate;
}): Promise<IShoppingMallBoardPost> {
  const now = toISOStringSafe(new Date());
  const postId = v4() as string & tags.Format<"uuid">;

  // Insert the new board post.
  const created = await MyGlobal.prisma.shopping_mall_board_posts.create({
    data: {
      id: postId,
      shopping_mall_board_id: props.boardId,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_parent_post_id:
        props.body.shopping_mall_parent_post_id ?? undefined,
      title: props.body.title ?? undefined,
      body: props.body.body,
      is_official_answer: props.body.is_official_answer,
      visibility: props.body.visibility,
      moderation_status: props.body.moderation_status,
      moderation_reason: props.body.moderation_reason ?? undefined,
      shopping_mall_product_id:
        props.body.shopping_mall_product_id ?? undefined,
      shopping_mall_order_id: props.body.shopping_mall_order_id ?? undefined,
      reply_level: 0, // Default to 0 unless parent post found below.
      // seller/admin author fields remain undefined (not set for customer).
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // If it's a reply, update reply_level from parent post
  let replyLevel = 0;
  if (props.body.shopping_mall_parent_post_id !== undefined) {
    const parent = await MyGlobal.prisma.shopping_mall_board_posts.findUnique({
      where: { id: props.body.shopping_mall_parent_post_id },
      select: { reply_level: true },
    });
    if (parent && typeof parent.reply_level === "number") {
      replyLevel = parent.reply_level + 1;
      await MyGlobal.prisma.shopping_mall_board_posts.update({
        where: { id: created.id },
        data: { reply_level: replyLevel },
      });
    }
  }

  // Fetch the latest state to build the response
  const post =
    await MyGlobal.prisma.shopping_mall_board_posts.findUniqueOrThrow({
      where: { id: created.id },
    });

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
