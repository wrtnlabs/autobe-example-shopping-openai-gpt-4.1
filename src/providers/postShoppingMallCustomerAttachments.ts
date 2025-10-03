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

export async function postShoppingMallCustomerAttachments(props: {
  customer: CustomerPayload;
  body: IShoppingMallAttachment.ICreate;
}): Promise<IShoppingMallAttachment> {
  // Generate new IDs and timestamps (all as branded types)
  const now = toISOStringSafe(new Date());
  const attachmentId = v4();
  const versionId = v4();

  // Business rule: hash_md5 is required but not present in ICreate; in production, backend must compute/validate. Here, throw error if not provided (ideally from upload process), or use a dummy hash for demo purpose.
  // Replace below with real hash in production.
  const hashMd5 = "dummy-md5-hash";

  // Insert the new attachment
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.create({
    data: {
      id: attachmentId,
      filename: props.body.filename,
      file_extension: props.body.file_extension,
      mime_type: props.body.mime_type,
      size_bytes: props.body.size_bytes,
      server_url: props.body.server_url,
      public_accessible: props.body.public_accessible,
      permission_scope: props.body.permission_scope ?? undefined,
      logical_source: props.body.logical_source ?? undefined,
      hash_md5: hashMd5,
      description: props.body.description ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Insert the initial attachment version
  await MyGlobal.prisma.shopping_mall_attachment_versions.create({
    data: {
      id: versionId,
      shopping_mall_attachment_id: attachment.id,
      version_number: 1,
      uploader_id: props.customer.id,
      filename: props.body.filename,
      file_extension: props.body.file_extension,
      mime_type: props.body.mime_type,
      size_bytes: props.body.size_bytes,
      server_url: props.body.server_url,
      hash_md5: hashMd5,
      created_at: now,
      deleted_at: undefined,
    },
  });

  // Return object matching IShoppingMallAttachment spec
  return {
    id: attachment.id,
    filename: attachment.filename,
    file_extension: attachment.file_extension,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    server_url: attachment.server_url,
    public_accessible: attachment.public_accessible,
    permission_scope: attachment.permission_scope ?? undefined,
    logical_source: attachment.logical_source ?? undefined,
    hash_md5: attachment.hash_md5,
    description: attachment.description ?? undefined,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at:
      attachment.deleted_at != null
        ? toISOStringSafe(attachment.deleted_at)
        : undefined,
  };
}
