import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminBoardsBoardIdPostsPostId(props: {
  admin: AdminPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Try to find the post, ensuring it is not already deleted and matches board
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
    },
    select: { id: true }, // Only need to check existence
  });
  if (!post) {
    throw new HttpException(
      "게시글을 찾을 수 없거나 이미 삭제되었습니다.",
      404,
    );
  }

  // Step 2: Soft delete the post by setting deleted_at
  await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: props.postId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // All snapshots remain untouched; audit trail exists
}
