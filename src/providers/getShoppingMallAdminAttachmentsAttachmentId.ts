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

export async function getShoppingMallAdminAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAttachment> {
  const record = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: props.attachmentId,
    },
  });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }
  return {
    id: record.id,
    filename: record.filename,
    file_extension: record.file_extension,
    mime_type: record.mime_type,
    size_bytes: record.size_bytes,
    server_url: record.server_url,
    public_accessible: record.public_accessible,
    permission_scope: record.permission_scope ?? undefined,
    logical_source: record.logical_source ?? undefined,
    hash_md5: record.hash_md5,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
