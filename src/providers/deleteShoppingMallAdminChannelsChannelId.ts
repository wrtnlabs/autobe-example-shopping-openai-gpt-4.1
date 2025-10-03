import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Attempt to mark the channel as deleted, only if it is currently not deleted.
  const result = await MyGlobal.prisma.shopping_mall_channels.updateMany({
    where: {
      id: props.channelId,
      deleted_at: null,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Step 2: If no record was updated, channel does not exist or already deleted.
  if (result.count === 0) {
    throw new HttpException("Channel not found or already deleted", 404);
  }
}
