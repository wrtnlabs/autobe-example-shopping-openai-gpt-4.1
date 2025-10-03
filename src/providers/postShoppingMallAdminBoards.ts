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

export async function postShoppingMallAdminBoards(props: {
  admin: AdminPayload;
  body: IShoppingMallBoard.ICreate;
}): Promise<IShoppingMallBoard> {
  const now = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_boards.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_channel_id: props.body.shopping_mall_channel_id,
        shopping_mall_section_id:
          props.body.shopping_mall_section_id ?? undefined,
        title: props.body.title,
        description: props.body.description ?? undefined,
        visibility: props.body.visibility,
        moderation_required: props.body.moderation_required,
        post_expiry_days: props.body.post_expiry_days ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002" &&
      "name" in err &&
      (err as any).name === "PrismaClientKnownRequestError"
    ) {
      throw new HttpException(
        "Duplicate board: title must be unique within channel/section.",
        409,
      );
    }
    throw new HttpException("Failed to create board", 500);
  }
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_channel_id: created.shopping_mall_channel_id as string &
      tags.Format<"uuid">,
    shopping_mall_section_id: created.shopping_mall_section_id ?? undefined,
    title: created.title,
    description: created.description ?? undefined,
    visibility: created.visibility,
    moderation_required: created.moderation_required,
    post_expiry_days: created.post_expiry_days ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null ? toISOStringSafe(created.deleted_at) : null,
  };
}
