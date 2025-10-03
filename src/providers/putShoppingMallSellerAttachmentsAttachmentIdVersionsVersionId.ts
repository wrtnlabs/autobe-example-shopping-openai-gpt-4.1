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

export async function putShoppingMallSellerAttachmentsAttachmentIdVersionsVersionId(props: {
  seller: SellerPayload;
  attachmentId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.IUpdate;
}): Promise<IShoppingMallAttachmentVersion> {
  // Ensure the attachment version exists, is matched with requested attachment, and is not deleted
  const version =
    await MyGlobal.prisma.shopping_mall_attachment_versions.findFirst({
      where: {
        id: props.versionId,
        shopping_mall_attachment_id: props.attachmentId,
        deleted_at: null,
      },
    });
  if (!version) {
    throw new HttpException(
      "Attachment version not found or already deleted",
      404,
    );
  }
  // Only uploader can update the version (seller-only endpoint)
  if (version.uploader_id !== props.seller.id) {
    throw new HttpException(
      "Only the original uploader can update this attachment version.",
      403,
    );
  }
  // Update only valid fields
  const updated =
    await MyGlobal.prisma.shopping_mall_attachment_versions.update({
      where: { id: props.versionId },
      data: {
        filename: props.body.filename ?? undefined,
        file_extension: props.body.file_extension ?? undefined,
        mime_type: props.body.mime_type ?? undefined,
        // description is not part of the schema, do not include
        // updated_at is also not present in this table schema
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
