import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerBoardsBoardIdPostsPostId(props: {
  seller: SellerPayload;
  boardId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the post matching postId, boardId, not deleted, and belonging to this seller
  const post = await MyGlobal.prisma.shopping_mall_board_posts.findFirst({
    where: {
      id: props.postId,
      shopping_mall_board_id: props.boardId,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });

  // Step 2: Not found means it doesn't exist, isn't owned by seller, or is already deleted
  if (!post) {
    throw new HttpException(
      "Not found or you do not have permission to delete this post.",
      404,
    );
  }

  // Step 3: Perform soft delete
  await MyGlobal.prisma.shopping_mall_board_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
