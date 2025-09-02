import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates file metadata for a file in shopping_mall_ai_backend_files by fileId.
 *
 * This endpoint allows admins to update the metadata of an existing file such
 * as the file name, mime type, or storage URI. File content is not modified.
 * Strict permission and regulatory audit are enforced. Unique constraint is
 * maintained on storage_uri among all non-deleted files. Updating a
 * soft-deleted file is forbidden except when explicitly un-deleting it (setting
 * deleted_at to null with no other changes). All date/datetime fields are
 * handled as ISO8601 strings.
 *
 * @param props - Properties for file update operation
 * @param props.admin - Authenticated admin user payload
 * @param props.fileId - The unique file ID to update
 * @param props.body - The file metadata updates
 *   ({@link IShoppingMallAiBackendFile.IUpdate})
 * @returns The updated file metadata record ({@link IShoppingMallAiBackendFile})
 * @throws {Error} If file not found, updating forbidden fields, already
 *   soft-deleted (except undelete), or unique violation
 */
export async function put__shoppingMallAiBackend_admin_files_$fileId(props: {
  admin: AdminPayload;
  fileId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFile.IUpdate;
}): Promise<IShoppingMallAiBackendFile> {
  const { admin, fileId, body } = props;

  // 1. Fetch the current file by fileId
  const file = await MyGlobal.prisma.shopping_mall_ai_backend_files.findFirst({
    where: { id: fileId },
  });
  if (!file) {
    throw new Error("File not found");
  }

  // 2. If the file is soft deleted, allow only un-delete (deleted_at: null and no other changes)
  const fileIsDeleted =
    file.deleted_at !== null && file.deleted_at !== undefined;
  if (fileIsDeleted) {
    const onlyRestore =
      "deleted_at" in body &&
      body.deleted_at === null &&
      Object.keys(body).length === 1;
    if (!onlyRestore) {
      throw new Error(
        "Cannot update metadata of a deleted file. Only un-delete is allowed.",
      );
    }
  }

  // 3. If updating storage_uri, check for unique constraint (other files, not deleted, and not self)
  if (body.storage_uri !== undefined && body.storage_uri !== file.storage_uri) {
    const uriConflict =
      await MyGlobal.prisma.shopping_mall_ai_backend_files.findFirst({
        where: {
          storage_uri: body.storage_uri,
          deleted_at: null,
          id: { not: fileId },
        },
      });
    if (uriConflict) {
      throw new Error(
        "storage_uri must be unique among all non-deleted files.",
      );
    }
  }

  // 4. Prepare update input (only mutable fields)
  const updateInput = {
    ...(body.original_filename !== undefined && {
      original_filename: body.original_filename,
    }),
    ...(body.mime_type !== undefined && { mime_type: body.mime_type }),
    ...(body.storage_uri !== undefined && { storage_uri: body.storage_uri }),
    ...(body.size_bytes !== undefined && { size_bytes: body.size_bytes }),
    // deleted_at can be null (soft delete) or omitted
    ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
  } satisfies IShoppingMallAiBackendFile.IUpdate;

  // 5. Execute update
  const updated = await MyGlobal.prisma.shopping_mall_ai_backend_files.update({
    where: { id: fileId },
    data: updateInput,
  });

  // 6. Return updated metadata (convert datetimes to ISO strings)
  return {
    id: updated.id,
    original_filename: updated.original_filename,
    mime_type: updated.mime_type,
    storage_uri: updated.storage_uri,
    size_bytes: updated.size_bytes,
    uploaded_by_id: updated.uploaded_by_id,
    uploaded_at: toISOStringSafe(updated.uploaded_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
