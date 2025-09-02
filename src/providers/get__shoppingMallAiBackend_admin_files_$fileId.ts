import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get file metadata by fileId from shopping_mall_ai_backend_files.
 *
 * Fetches the complete metadata record for a given file, including storage URI,
 * original filename, mime type, file size, uploader's ID, upload datetime, and
 * soft delete status (deleted_at). Used for evidence, admin review, and legal
 * production by authorized administrators.
 *
 * Only system admins may invoke this function; access without sufficient
 * privilege is denied by the decorated controller. Attempts to fetch a
 * non-existent file record result in an error.
 *
 * @param props - The request props.
 * @param props.admin - The authenticated admin payload object. Required for
 *   access.
 * @param props.fileId - Unique identifier (UUID) of the file metadata to fetch.
 * @returns The complete metadata record for the requested file, normalized to
 *   local DTO types.
 * @throws {Error} If no file exists with the requested fileId.
 */
export async function get__shoppingMallAiBackend_admin_files_$fileId(props: {
  admin: AdminPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFile> {
  const { admin, fileId } = props;
  const file =
    await MyGlobal.prisma.shopping_mall_ai_backend_files.findUniqueOrThrow({
      where: { id: fileId },
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        storage_uri: true,
        size_bytes: true,
        uploaded_by_id: true,
        uploaded_at: true,
        deleted_at: true,
      },
    });
  return {
    id: file.id,
    original_filename: file.original_filename,
    mime_type: file.mime_type,
    storage_uri: file.storage_uri,
    size_bytes: file.size_bytes,
    uploaded_by_id: file.uploaded_by_id,
    uploaded_at: toISOStringSafe(file.uploaded_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
  };
}
