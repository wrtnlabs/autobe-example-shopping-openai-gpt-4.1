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

export async function getShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallChannel> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      id: props.channelId,
      deleted_at: null,
    },
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }
  return {
    id: channel.id,
    code: channel.code,
    name: channel.name,
    description: channel.description ?? undefined,
    created_at: toISOStringSafe(channel.created_at),
    updated_at: toISOStringSafe(channel.updated_at),
    deleted_at: channel.deleted_at
      ? toISOStringSafe(channel.deleted_at)
      : undefined,
  };
}
