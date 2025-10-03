import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";

export async function getShoppingMallEntityAttachmentLinksEntityAttachmentLinkId(props: {
  entityAttachmentLinkId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallEntityAttachmentLink> {
  const found =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.findUnique({
      where: { id: props.entityAttachmentLinkId },
    });

  if (!found || found.deleted_at !== null) {
    throw new HttpException("Entity-attachment link not found", 404);
  }

  return {
    id: found.id,
    shopping_mall_attachment_id: found.shopping_mall_attachment_id,
    entity_type: found.entity_type,
    entity_id: found.entity_id,
    linked_by_user_id: found.linked_by_user_id,
    purpose: found.purpose === null ? undefined : found.purpose,
    visible_to_roles:
      found.visible_to_roles === null ? undefined : found.visible_to_roles,
    created_at: toISOStringSafe(found.created_at),
    deleted_at:
      found.deleted_at === null ? undefined : toISOStringSafe(found.deleted_at),
  };
}
