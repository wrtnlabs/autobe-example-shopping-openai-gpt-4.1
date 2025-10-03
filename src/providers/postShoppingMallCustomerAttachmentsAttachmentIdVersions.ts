import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerAttachmentsAttachmentIdVersions(props: {
  customer: CustomerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.ICreate;
}): Promise<IShoppingMallAttachmentVersion> {
  // 1. Check that the referenced attachment exists and is not deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findUnique(
    {
      where: { id: props.attachmentId },
      select: { id: true, deleted_at: true },
    },
  );
  if (!attachment || attachment.deleted_at !== null) {
    throw new HttpException(
      "Attachment not found (may not exist, or is deleted)",
      404,
    );
  }

  // 2. Determine the next version_number for this attachment
  const lastVersion =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: { shopping_mall_attachment_id: props.attachmentId },
      orderBy: { version_number: "desc" },
      select: { version_number: true },
    });
  const version_number = (lastVersion?.version_number ?? 0) + 1;

  // 3. Generate an id for the new version
  const id = v4();
  const now = toISOStringSafe(new Date());

  // 4. Insert the new version
  const created =
    await MyGlobal.prisma.shopping_mall_attachment_versions.create({
      data: {
        id,
        shopping_mall_attachment_id: props.attachmentId,
        version_number,
        uploader_id: props.body.uploader_id,
        filename: props.body.filename,
        file_extension: props.body.file_extension,
        mime_type: props.body.mime_type,
        size_bytes: props.body.size_bytes,
        server_url: props.body.server_url,
        hash_md5: props.body.hash_md5,
        created_at: now,
        deleted_at: null,
      },
    });

  // 5. Return API type result
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
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
