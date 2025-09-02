import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Register a new file metadata entry in shopping_mall_ai_backend_files.
 *
 * This operation registers a new file in the system by saving its metadata
 * record, such as original filename, mime type, storage URI, file size, and
 * uploader information, in the shopping_mall_ai_backend_files table. This
 * endpoint does not upload the file content itself, but records essential
 * metadata so the object store or CDN can reference the resource securely. Only
 * admin users can invoke this endpoint due to operational and privacy risks.
 *
 * @param props - Properties for the request
 * @param props.admin - Authenticated admin payload (must be active/enrolled)
 * @param props.body - New file metadata to register (original filename, mime
 *   type, storage URI, file size, uploader UUID, upload time)
 * @returns The newly registered file metadata record, including generated ID
 *   and all metadata fields
 * @throws {Error} If the storage_uri is not unique (duplicate file)
 * @throws {Error} On any database or validation errors
 */
export async function post__shoppingMallAiBackend_admin_files(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendFile.ICreate;
}): Promise<IShoppingMallAiBackendFile> {
  const { admin, body } = props;

  // Create the metadata record with strict one-to-one mapping
  const created = await MyGlobal.prisma.shopping_mall_ai_backend_files.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      original_filename: body.original_filename,
      mime_type: body.mime_type,
      storage_uri: body.storage_uri,
      size_bytes: body.size_bytes,
      uploaded_by_id: body.uploaded_by_id,
      uploaded_at: toISOStringSafe(body.uploaded_at),
      // deleted_at omitted (null by default for new records)
    } satisfies IShoppingMallAiBackendFile.ICreate & {
      id: string & tags.Format<"uuid">;
      uploaded_at: string & tags.Format<"date-time">;
    },
  });

  // Convert all dates to proper ISO 8601 strings with correct branding
  return {
    id: created.id,
    original_filename: created.original_filename,
    mime_type: created.mime_type,
    storage_uri: created.storage_uri,
    size_bytes: created.size_bytes,
    uploaded_by_id: created.uploaded_by_id,
    uploaded_at: toISOStringSafe(created.uploaded_at),
    deleted_at:
      created.deleted_at != null ? toISOStringSafe(created.deleted_at) : null,
  };
}
