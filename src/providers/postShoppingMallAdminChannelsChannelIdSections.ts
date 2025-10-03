import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminChannelsChannelIdSections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  // Check uniqueness of section code within the same channel (not soft-deleted)
  const exists = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      shopping_mall_channel_id: props.channelId,
      code: props.body.code,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException(
      "Section code must be unique within the channel",
      409,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const section = await MyGlobal.prisma.shopping_mall_sections.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_channel_id: props.channelId,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? undefined,
      display_order: props.body.display_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: section.id,
    shopping_mall_channel_id: section.shopping_mall_channel_id,
    code: section.code,
    name: section.name,
    description: section.description ?? undefined,
    display_order: section.display_order,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at:
      section.deleted_at !== null && section.deleted_at !== undefined
        ? toISOStringSafe(section.deleted_at)
        : null,
  };
}
