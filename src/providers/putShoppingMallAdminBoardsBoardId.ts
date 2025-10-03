import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminBoardsBoardId(props: {
  admin: AdminPayload;
  boardId: string & tags.Format<"uuid">;
  body: IShoppingMallBoard.IUpdate;
}): Promise<IShoppingMallBoard> {
  const { boardId, body } = props;

  const prev = await MyGlobal.prisma.shopping_mall_boards.findFirst({
    where: { id: boardId, deleted_at: null },
  });
  if (!prev) throw new HttpException("Board not found", 404);

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_boards.update({
    where: { id: boardId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.visibility !== undefined && { visibility: body.visibility }),
      ...(body.moderation_required !== undefined && {
        moderation_required: body.moderation_required,
      }),
      ...(body.post_expiry_days !== undefined && {
        post_expiry_days: body.post_expiry_days,
      }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_section_id:
      updated.shopping_mall_section_id !== undefined
        ? updated.shopping_mall_section_id
        : undefined,
    title: updated.title,
    description:
      updated.description !== undefined ? updated.description : undefined,
    visibility: updated.visibility,
    moderation_required: updated.moderation_required,
    post_expiry_days:
      updated.post_expiry_days !== undefined
        ? updated.post_expiry_days
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
