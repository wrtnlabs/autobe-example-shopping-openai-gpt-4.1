import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachment.IUpdate;
}): Promise<IShoppingMallAttachment> {
  const { attachmentId, body } = props;

  // 1. Find the attachment to update (must exist and not be deleted)
  const existing = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: attachmentId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("Attachment not found", 404);
  }

  // 2. Perform the update with only allowed mutable fields
  const updated = await MyGlobal.prisma.shopping_mall_attachments.update({
    where: { id: attachmentId },
    data: {
      filename: body.filename ?? undefined,
      file_extension: body.file_extension ?? undefined,
      mime_type: body.mime_type ?? undefined,
      permission_scope: body.permission_scope ?? undefined,
      logical_source: body.logical_source ?? undefined,
      description: body.description ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Return the updated attachment, ensuring type/format compliance
  return {
    id: updated.id,
    filename: updated.filename,
    file_extension: updated.file_extension,
    mime_type: updated.mime_type,
    size_bytes: updated.size_bytes,
    server_url: updated.server_url,
    public_accessible: updated.public_accessible,
    permission_scope: updated.permission_scope ?? undefined,
    logical_source: updated.logical_source ?? undefined,
    hash_md5: updated.hash_md5,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
