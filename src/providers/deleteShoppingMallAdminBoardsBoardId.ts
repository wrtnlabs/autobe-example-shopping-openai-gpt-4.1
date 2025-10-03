import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminBoardsBoardId(props: {
  admin: AdminPayload;
  boardId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate the board exists and is not already deleted
  const board = await MyGlobal.prisma.shopping_mall_boards.findUnique({
    where: { id: props.boardId },
  });
  if (board === null || board.deleted_at !== null) {
    throw new HttpException("Board not found or already deleted", 404);
  }
  // Step 2: Perform soft-delete (set deleted_at)
  await MyGlobal.prisma.shopping_mall_boards.update({
    where: { id: props.boardId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
