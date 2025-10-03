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

export async function postShoppingMallAdminAttachmentsAttachmentIdVersions(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.ICreate;
}): Promise<IShoppingMallAttachmentVersion> {
  const { admin, attachmentId, body } = props;

  // Step 1: Ensure the attachment exists and is not soft/hard deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findUnique(
    {
      where: {
        id: attachmentId,
        deleted_at: null,
      },
    },
  );
  if (!attachment) {
    throw new HttpException("Attachment not found or has been deleted.", 404);
  }

  // Step 2: Get latest version_number for this attachment
  const latest =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findMany({
      where: { shopping_mall_attachment_id: attachmentId },
      select: { version_number: true },
      orderBy: { version_number: "desc" },
      take: 1,
    });
  const nextVersion = (latest.length > 0 ? latest[0].version_number : 0) + 1;

  // Step 3: Create new version record
  const created =
    await MyGlobal.prisma.shopping_mall_attachment_versions.create({
      data: {
        id: v4(),
        shopping_mall_attachment_id: attachmentId,
        version_number: nextVersion,
        uploader_id: body.uploader_id,
        filename: body.filename,
        file_extension: body.file_extension,
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        server_url: body.server_url,
        hash_md5: body.hash_md5,
        created_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_attachment_id: created.shopping_mall_attachment_id,
    version_number: created.version_number,
    uploader_id: created.uploader_id,
    filename: created.filename,
    file_extension: created.file_extension,
    mime_type: created.mime_type,
    size_bytes: created.size_bytes,
    server_url: created.server_url,
    hash_md5: created.hash_md5,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
