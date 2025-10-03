import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAttachmentsAttachmentIdVersionsVersionId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.IUpdate;
}): Promise<IShoppingMallAttachmentVersion> {
  const { attachmentId, versionId, body } = props;

  const version =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: {
        id: versionId,
        shopping_mall_attachment_id: attachmentId,
      },
    });
  if (!version) throw new HttpException("Attachment version not found", 404);
  if (version.deleted_at !== null)
    throw new HttpException("Cannot update a deleted attachment version", 400);

  const updated =
    await MyGlobal.prisma.shopping_mall_attachment_versions.update({
      where: { id: versionId },
      data: {
        filename: body.filename ?? undefined,
        file_extension: body.file_extension ?? undefined,
        mime_type: body.mime_type ?? undefined,
        // description does not exist in the schema for this model
      },
    });

  return {
    id: updated.id,
    shopping_mall_attachment_id: updated.shopping_mall_attachment_id,
    version_number: updated.version_number,
    uploader_id: updated.uploader_id,
    filename: updated.filename,
    file_extension: updated.file_extension,
    mime_type: updated.mime_type,
    size_bytes: updated.size_bytes,
    server_url: updated.server_url,
    hash_md5: updated.hash_md5,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
