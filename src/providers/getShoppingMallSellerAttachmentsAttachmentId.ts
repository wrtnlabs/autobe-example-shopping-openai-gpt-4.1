import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerAttachmentsAttachmentId(props: {
  seller: SellerPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAttachment> {
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findUnique(
    {
      where: {
        id: props.attachmentId,
        deleted_at: null,
      },
    },
  );
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Only allow if permission_scope == 'seller'.
  if (attachment.permission_scope !== "seller") {
    throw new HttpException(
      "Forbidden: You do not have permission to access this attachment.",
      403,
    );
  }
  return {
    id: attachment.id,
    filename: attachment.filename,
    file_extension: attachment.file_extension,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    server_url: attachment.server_url,
    public_accessible: attachment.public_accessible,
    hash_md5: attachment.hash_md5,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    permission_scope: attachment.permission_scope ?? undefined,
    logical_source: attachment.logical_source ?? undefined,
    description: attachment.description ?? undefined,
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : undefined,
  };
}
