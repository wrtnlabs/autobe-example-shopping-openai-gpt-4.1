import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAttachmentsAttachmentIdVersions(props: {
  seller: SellerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.ICreate;
}): Promise<IShoppingMallAttachmentVersion> {
  // Step 1: Find the attachment by ID, ensure not soft-deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findUnique(
    {
      where: { id: props.attachmentId },
      select: { id: true, deleted_at: true, filename: true },
    },
  );
  if (!attachment || attachment.deleted_at !== null) {
    throw new HttpException("Attachment not found or deleted", 404);
  }

  // (Extra: Ownership check - business constraint unclear in schema, so skip true seller linkage as attachment table doesn't distinguish; relying on seller-level endpoint/authorization)

  // Step 2: Find current max version number
  const lastVersion =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: { shopping_mall_attachment_id: props.attachmentId },
      orderBy: { version_number: "desc" },
      select: { version_number: true },
    });
  const nextVersion = lastVersion ? lastVersion.version_number + 1 : 1;

  // Step 3: Now timestamp for creation
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 4: Create new version
  const created =
    await MyGlobal.prisma.shopping_mall_attachment_versions.create({
      data: {
        id: v4(),
        shopping_mall_attachment_id: props.attachmentId,
        version_number: nextVersion,
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

  // Step 5: Return DTO with faithful type conversion, no as, all conversions explicit
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
