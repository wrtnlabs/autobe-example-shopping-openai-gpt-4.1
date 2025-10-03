import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";

export async function getShoppingMallBoardsBoardId(props: {
  boardId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBoard> {
  const board = await MyGlobal.prisma.shopping_mall_boards.findFirst({
    where: {
      id: props.boardId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_channel_id: true,
      shopping_mall_section_id: true,
      title: true,
      description: true,
      visibility: true,
      moderation_required: true,
      post_expiry_days: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!board) {
    throw new HttpException("Board not found or access denied", 404);
  }
  return {
    id: board.id,
    shopping_mall_channel_id: board.shopping_mall_channel_id,
    shopping_mall_section_id:
      board.shopping_mall_section_id === null
        ? undefined
        : board.shopping_mall_section_id,
    title: board.title,
    description: board.description === null ? undefined : board.description,
    visibility: board.visibility,
    moderation_required: board.moderation_required,
    post_expiry_days:
      board.post_expiry_days === null ? undefined : board.post_expiry_days,
    created_at: toISOStringSafe(board.created_at),
    updated_at: toISOStringSafe(board.updated_at),
    deleted_at: board.deleted_at
      ? toISOStringSafe(board.deleted_at)
      : undefined,
  };
}
