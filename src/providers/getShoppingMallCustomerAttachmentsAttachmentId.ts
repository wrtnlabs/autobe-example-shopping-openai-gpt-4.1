import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerAttachmentsAttachmentId(props: {
  customer: CustomerPayload;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAttachment> {
  const record = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: props.attachmentId,
      deleted_at: null,
    },
  });
  if (record === null) {
    throw new HttpException("Attachment not found or deleted", 404);
  }

  // Enforce permission: allow if public_accessible is true or permission_scope is 'public'; deny otherwise
  const isPublic =
    record.public_accessible === true || record.permission_scope === "public";
  if (!isPublic) {
    // (Domain: normally, would require ownership linkage; since not in schema, must deny for non-public)
    throw new HttpException("Access denied to attachment", 403);
  }

  return {
    id: record.id,
    filename: record.filename,
    file_extension: record.file_extension,
    mime_type: record.mime_type,
    size_bytes: record.size_bytes,
    server_url: record.server_url,
    public_accessible: record.public_accessible,
    permission_scope:
      record.permission_scope === null ? undefined : record.permission_scope,
    logical_source:
      record.logical_source === null ? undefined : record.logical_source,
    hash_md5: record.hash_md5,
    description: record.description === null ? undefined : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
