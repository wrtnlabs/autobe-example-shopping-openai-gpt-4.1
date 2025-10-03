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

export async function postShoppingMallAdminChannelsChannelIdCategories(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallChannelCategory.ICreate;
}): Promise<IShoppingMallChannelCategory> {
  const now = toISOStringSafe(new Date());
  const {
    channelId,
    body: {
      shopping_mall_channel_id,
      parent_id,
      code,
      name,
      description,
      display_order,
    },
  } = props;

  // Enforce request path/channel-body match
  if (channelId !== shopping_mall_channel_id) {
    throw new HttpException("ChannelId in path and body do not match.", 400);
  }

  // If parent_id specified (not null/undefined), ensure it exists and belongs to correct channel
  if (parent_id !== undefined && parent_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
        where: {
          id: parent_id,
          shopping_mall_channel_id: channelId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!parent) {
      throw new HttpException(
        "Invalid parent_id: Not found in this channel or has been deleted.",
        400,
      );
    }
  }

  // Uniqueness validation for code (DB will enforce, but check for business error message)
  const codeDupe =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        shopping_mall_channel_id: channelId,
        code,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (codeDupe) {
    throw new HttpException(
      "Category code must be unique within the channel.",
      409,
    );
  }
  // Name uniqueness within channel (not strictly DB, business layer)
  const nameDupe =
    await MyGlobal.prisma.shopping_mall_channel_categories.findFirst({
      where: {
        shopping_mall_channel_id: channelId,
        name,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (nameDupe) {
    throw new HttpException(
      "Category name must be unique within the channel.",
      409,
    );
  }

  // Create category
  const created = await MyGlobal.prisma.shopping_mall_channel_categories.create(
    {
      data: {
        id: v4(),
        shopping_mall_channel_id: channelId,
        parent_id: parent_id ?? null,
        code,
        name,
        description: description ?? null,
        display_order,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    shopping_mall_channel_id: created.shopping_mall_channel_id,
    parent_id: created.parent_id === null ? undefined : created.parent_id,
    code: created.code,
    name: created.name,
    description: created.description === null ? undefined : created.description,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
