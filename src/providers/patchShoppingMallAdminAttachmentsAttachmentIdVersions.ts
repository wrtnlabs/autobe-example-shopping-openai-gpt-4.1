import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import { IPageIShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAttachmentVersion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAttachmentsAttachmentIdVersions(props: {
  admin: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IShoppingMallAttachmentVersion.IRequest;
}): Promise<IPageIShoppingMallAttachmentVersion> {
  const { admin, attachmentId, body } = props;

  // 1. Verify attachment exists and is not deleted
  const attachment = await MyGlobal.prisma.shopping_mall_attachments.findFirst({
    where: {
      id: attachmentId,
      deleted_at: null,
    },
  });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // 2. Filters
  const where: Record<string, any> = {
    shopping_mall_attachment_id: attachmentId,
    ...(body.filename !== undefined &&
      body.filename !== null && { filename: body.filename }),
    ...(body.file_extension !== undefined &&
      body.file_extension !== null && { file_extension: body.file_extension }),
    ...(body.mime_type !== undefined &&
      body.mime_type !== null && { mime_type: body.mime_type }),
    ...(body.uploader_id !== undefined &&
      body.uploader_id !== null && { uploader_id: body.uploader_id }),
    ...(body.hash_md5 !== undefined &&
      body.hash_md5 !== null && { hash_md5: body.hash_md5 }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    // deleted_at: if null, filter out deleted, else match specific timestamp
    ...(body.deleted_at === undefined
      ? {}
      : body.deleted_at === null
        ? { deleted_at: null }
        : { deleted_at: body.deleted_at }),
  };

  // 3. Sorting
  const ALLOWED_SORT_FIELDS = [
    "created_at",
    "filename",
    "file_extension",
    "mime_type",
    "uploader_id",
  ];
  let sortField =
    body.sort !== undefined && ALLOWED_SORT_FIELDS.includes(body.sort)
      ? body.sort
      : "created_at";
  let sortOrder = body.order === "asc" ? "asc" : "desc";

  // 4. Pagination
  const page = body.page !== undefined && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // 5. Fetch data
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_attachment_versions.findMany({
      where,
      orderBy: [{ [sortField]: sortOrder }],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_attachment_versions.count({ where }),
  ]);

  // 6. Map rows to DTO
  const data: IShoppingMallAttachmentVersion[] = rows.map((row) => ({
    id: row.id,
    shopping_mall_attachment_id: row.shopping_mall_attachment_id,
    version_number: row.version_number,
    uploader_id: row.uploader_id,
    filename: row.filename,
    file_extension: row.file_extension,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    server_url: row.server_url,
    hash_md5: row.hash_md5,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  // 7. Return
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
