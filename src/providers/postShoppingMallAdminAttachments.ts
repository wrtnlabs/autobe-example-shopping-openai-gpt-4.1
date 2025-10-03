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

export async function postShoppingMallAdminAttachments(props: {
  admin: AdminPayload;
  body: IShoppingMallAttachment.ICreate & { hash_md5: string };
}): Promise<IShoppingMallAttachment> {
  const now = toISOStringSafe(new Date());
  const uuid = v4();

  const created = await MyGlobal.prisma.shopping_mall_attachments.create({
    data: {
      id: uuid,
      filename: props.body.filename,
      file_extension: props.body.file_extension,
      mime_type: props.body.mime_type,
      size_bytes: props.body.size_bytes,
      server_url: props.body.server_url,
      public_accessible: props.body.public_accessible,
      permission_scope: props.body.permission_scope ?? undefined,
      logical_source: props.body.logical_source ?? undefined,
      description: props.body.description ?? undefined,
      hash_md5: props.body.hash_md5,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    filename: created.filename,
    file_extension: created.file_extension,
    mime_type: created.mime_type,
    size_bytes: created.size_bytes,
    server_url: created.server_url,
    public_accessible: created.public_accessible,
    permission_scope: created.permission_scope ?? undefined,
    logical_source: created.logical_source ?? undefined,
    hash_md5: created.hash_md5,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
