import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify section exists in specified channel and is not already deleted
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      id: props.sectionId,
      shopping_mall_channel_id: props.channelId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found or already deleted", 404);
  }

  // Soft delete section by setting deleted_at
  await MyGlobal.prisma.shopping_mall_sections.update({
    where: { id: props.sectionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
