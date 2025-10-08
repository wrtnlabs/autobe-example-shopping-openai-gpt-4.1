import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminModerationEventLogsModerationEventLogId(props: {
  admin: AdminPayload;
  moderationEventLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const found =
    await MyGlobal.prisma.shopping_mall_moderation_event_logs.findUnique({
      where: { id: props.moderationEventLogId },
    });
  if (!found) {
    throw new HttpException("Moderation event log not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_moderation_event_logs.delete({
    where: { id: props.moderationEventLogId },
  });
}
