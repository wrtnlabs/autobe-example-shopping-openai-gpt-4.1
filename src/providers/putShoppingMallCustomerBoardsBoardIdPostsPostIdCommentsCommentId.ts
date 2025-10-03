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

export async function putShoppingMallCustomerBoardsBoardIdPostsPostIdCommentsCommentId(props: {
  customer: CustomerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IShoppingMallComment.IUpdate;
}): Promise<IShoppingMallComment> {
  const { customer, boardId, postId, commentId, body } = props;
  const comment = await MyGlobal.prisma.shopping_mall_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      shopping_mall_board_post_id: true,
      shopping_mall_customer_id: true,
      shopping_mall_seller_id: true,
      shopping_mall_admin_id: true,
      body: true,
      level: true,
      moderation_status: true,
      moderation_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      // batch_label: true,  // removed: not a selectable field
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.shopping_mall_board_post_id !== postId) {
    throw new HttpException(
      "Comment does not belong to the specified post.",
      404,
    );
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted comment.", 400);
  }
  if (comment.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "You are not authorized to edit this comment.",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_comment_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_comment_id: comment.id,
      body: comment.body,
      level: comment.level,
      moderation_status: comment.moderation_status,
      moderation_reason: comment.moderation_reason ?? null,
      snapshot_reason: "edit",
      created_at: toISOStringSafe(new Date()),
    },
  });
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_comments.update({
    where: { id: comment.id },
    data: {
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.moderation_status !== undefined
        ? { moderation_status: body.moderation_status }
        : {}),
      ...(body.moderation_reason !== undefined
        ? { moderation_reason: body.moderation_reason }
        : {}),
      ...(body.batch_label !== undefined
        ? { batch_label: body.batch_label }
        : {}),
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_board_post_id: updated.shopping_mall_board_post_id,
    shopping_mall_product_inquiry_id:
      updated.shopping_mall_product_inquiry_id ?? undefined,
    shopping_mall_review_id: updated.shopping_mall_review_id ?? undefined,
    shopping_mall_parent_comment_id:
      updated.shopping_mall_parent_comment_id ?? undefined,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? undefined,
    shopping_mall_seller_id: updated.shopping_mall_seller_id ?? undefined,
    shopping_mall_admin_id: updated.shopping_mall_admin_id ?? undefined,
    body: updated.body,
    level: updated.level,
    moderation_status: updated.moderation_status,
    moderation_reason: updated.moderation_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
