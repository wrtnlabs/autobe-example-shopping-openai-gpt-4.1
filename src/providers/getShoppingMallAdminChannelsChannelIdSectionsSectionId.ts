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

export async function getShoppingMallAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSection> {
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      id: props.sectionId,
      shopping_mall_channel_id: props.channelId,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  return {
    id: section.id,
    shopping_mall_channel_id: section.shopping_mall_channel_id,
    code: section.code,
    name: section.name,
    description:
      typeof section.description === "string"
        ? section.description
        : section.description === null
          ? null
          : undefined,
    display_order: section.display_order,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at:
      section.deleted_at != null
        ? toISOStringSafe(section.deleted_at)
        : section.deleted_at === null
          ? null
          : undefined,
  };
}
