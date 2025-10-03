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

export async function putShoppingMallAdminChannelsChannelIdSectionsSectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallSection.IUpdate;
}): Promise<IShoppingMallSection> {
  const now = toISOStringSafe(new Date());

  // 1. Find section by id+channel (must not be deleted)
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      id: props.sectionId,
      shopping_mall_channel_id: props.channelId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }

  // 2. If code update, check for unique constraint violation
  if (props.body.code !== undefined && props.body.code !== section.code) {
    const codeConflict = await MyGlobal.prisma.shopping_mall_sections.findFirst(
      {
        where: {
          shopping_mall_channel_id: props.channelId,
          code: props.body.code,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      },
    );
    if (codeConflict) {
      throw new HttpException(
        "Section code must be unique within the channel",
        409,
      );
    }
  }

  // 3. Perform the update (skip undefined fields, allow null for description)
  const updated = await MyGlobal.prisma.shopping_mall_sections.update({
    where: { id: props.sectionId },
    data: {
      code: props.body.code ?? undefined,
      name: props.body.name ?? undefined,
      description:
        props.body.description !== undefined
          ? props.body.description
          : undefined,
      display_order: props.body.display_order ?? undefined,
      updated_at: now,
    },
  });

  // 4. Return the IShoppingMallSection (convert dates, handle undefined/null)
  return {
    id: updated.id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? undefined,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
