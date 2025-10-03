import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  // 1. Read existing (must not be deleted)
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: { id: props.channelId, deleted_at: null },
  });
  if (!channel) {
    throw new HttpException("Channel not found or already deleted", 404);
  }

  // 2. Update fields
  const now = toISOStringSafe(new Date());
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_channels.update({
      where: { id: props.channelId },
      data: {
        code: props.body.code ?? undefined,
        name: props.body.name ?? undefined,
        description:
          props.body.description !== undefined
            ? props.body.description
            : undefined,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta?.target.includes("code")
    ) {
      throw new HttpException("Channel code must be unique", 409);
    }
    throw err;
  }

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
