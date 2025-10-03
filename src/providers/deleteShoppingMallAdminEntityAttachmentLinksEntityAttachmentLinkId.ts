import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminEntityAttachmentLinksEntityAttachmentLinkId(props: {
  admin: AdminPayload;
  entityAttachmentLinkId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch active (not deleted) entity-attachment link
  const record =
    await MyGlobal.prisma.shopping_mall_entity_attachment_links.findUnique({
      where: { id: props.entityAttachmentLinkId },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException(
      "Entity-attachment link not found or already deleted",
      404,
    );
  }
  // 2. Soft delete: update deleted_at
  await MyGlobal.prisma.shopping_mall_entity_attachment_links.update({
    where: { id: props.entityAttachmentLinkId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
