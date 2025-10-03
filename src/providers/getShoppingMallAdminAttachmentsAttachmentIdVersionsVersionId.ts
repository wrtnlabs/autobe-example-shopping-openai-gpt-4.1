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

export async function getShoppingMallAdminAttachmentsAttachmentIdVersionsVersionId(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAttachmentVersion> {
  const { attachmentId, versionId } = props;
  const version =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: {
        id: versionId,
        shopping_mall_attachment_id: attachmentId,
        deleted_at: null,
      },
    });
  if (!version) {
    throw new HttpException("Attachment version not found", 404);
  }
  return {
    id: version.id,
    shopping_mall_attachment_id: version.shopping_mall_attachment_id,
    version_number: version.version_number,
    uploader_id: version.uploader_id,
    filename: version.filename,
    file_extension: version.file_extension,
    mime_type: version.mime_type,
    size_bytes: version.size_bytes,
    server_url: version.server_url,
    hash_md5: version.hash_md5,
    created_at: toISOStringSafe(version.created_at),
    deleted_at: version.deleted_at ? toISOStringSafe(version.deleted_at) : null,
  };
}
