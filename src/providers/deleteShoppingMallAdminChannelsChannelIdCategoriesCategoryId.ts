import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelIdCategoriesCategoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find category belonging to specified channel, not soft-deleted
  const category =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        id: props.categoryId,
        shopping_mall_channel_id: props.channelId,
        deleted_at: null,
      },
    });
  if (!category) {
    throw new HttpException(
      "Category not found, already deleted, or does not belong to this channel.",
      404,
    );
  }
  // Step 2: Soft-delete by setting deleted_at (use ISO string)
  await MyGlobal.prisma.shopping_mall_channel_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
