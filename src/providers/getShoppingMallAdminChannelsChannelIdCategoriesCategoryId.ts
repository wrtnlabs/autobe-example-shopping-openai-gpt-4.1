import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminChannelsChannelIdCategoriesCategoryId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallChannelCategory> {
  const category =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        id: props.categoryId,
        shopping_mall_channel_id: props.channelId,
        deleted_at: null,
      },
    });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  return {
    id: category.id,
    shopping_mall_channel_id: category.shopping_mall_channel_id,
    ...(category.parent_id !== null && { parent_id: category.parent_id }),
    code: category.code,
    name: category.name,
    ...(category.description !== null && { description: category.description }),
    display_order: category.display_order,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    // deleted_at is null in this select; omit to comply with base type
  };
}
