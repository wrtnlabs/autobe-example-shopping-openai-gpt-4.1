import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the attachment exists and is not already deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: props.attachmentId,
      deleted_at: null,
    },
  });
  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted", 404);
  }
  // Soft-delete by setting deleted_at to current ISO string
  await MyGlobal.prisma.shopping_mall_attachments.update({
    where: { id: props.attachmentId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
