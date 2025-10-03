import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminEntityAttachmentLinksEntityAttachmentLinkId(props: {
  admin: AdminPayload;
  entityAttachmentLinkId: string & tags.Format<"uuid">;
  body: IShoppingMallEntityAttachmentLink.IUpdate;
}): Promise<IShoppingMallEntityAttachmentLink> {
  const { admin, entityAttachmentLinkId, body } = props;

  // 1. Find the existing link, must not be soft deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.findUnique({
      where: { id: entityAttachmentLinkId },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Entity-attachment link not found", 404);
  }

  // 2. Update metadata fields (only mutable ones)
  const updated =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.update({
      where: { id: entityAttachmentLinkId },
      data: {
        ...(body.purpose !== undefined && { purpose: body.purpose }),
        ...(body.visible_to_roles !== undefined && {
          visible_to_roles: body.visible_to_roles,
        }),
      },
    });

  // 3. Return strict DTO, mapping optional fields and date-times
  return {
    id: updated.id,
    shopping_mall_attachment_id: updated.shopping_mall_attachment_id,
    entity_type: updated.entity_type,
    entity_id: updated.entity_id,
    linked_by_user_id: updated.linked_by_user_id,
    purpose: updated.purpose === null ? undefined : updated.purpose,
    visible_to_roles:
      updated.visible_to_roles === null ? undefined : updated.visible_to_roles,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
