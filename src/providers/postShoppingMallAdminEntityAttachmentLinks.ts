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

export async function postShoppingMallAdminEntityAttachmentLinks(props: {
  admin: AdminPayload;
  body: IShoppingMallEntityAttachmentLink.ICreate;
}): Promise<IShoppingMallEntityAttachmentLink> {
  // Check uniqueness (ignore soft-deleted rows)
  const exists =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.findFirst({
      where: {
        entity_type: props.body.entity_type,
        entity_id: props.body.entity_id,
        shopping_mall_attachment_id: props.body.shopping_mall_attachment_id,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new HttpException(
      "Duplicate entity-attachment link (already exists)",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.create({
      data: {
        id: v4(),
        shopping_mall_attachment_id: props.body.shopping_mall_attachment_id,
        entity_type: props.body.entity_type,
        entity_id: props.body.entity_id,
        linked_by_user_id: props.body.linked_by_user_id,
        purpose: props.body.purpose ?? undefined,
        visible_to_roles: props.body.visible_to_roles ?? undefined,
        created_at: now,
        deleted_at: undefined,
      },
    });
  return {
    id: created.id,
    shopping_mall_attachment_id: created.shopping_mall_attachment_id,
    entity_type: created.entity_type,
    entity_id: created.entity_id,
    linked_by_user_id: created.linked_by_user_id,
    purpose: created.purpose ?? undefined,
    visible_to_roles: created.visible_to_roles ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
