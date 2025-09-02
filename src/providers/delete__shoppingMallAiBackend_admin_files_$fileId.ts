import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a file metadata entry by fileId in
 * shopping_mall_ai_backend_files.
 *
 * Mark a file metadata record as deleted by setting its deleted_at timestamp,
 * effectively hiding it from standard queries but retaining the audit trail.
 * This is a soft delete, preserving file history for business evidence and
 * compliance. Only admin users may logically delete files. Actual file content
 * retention/deletion is handled elsewhere. All operations are auditable.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.fileId - Unique identifier of the file to logically delete
 * @returns Void
 * @throws {Error} When file does not exist
 * @throws {Error} When file is already deleted
 */
export async function delete__shoppingMallAiBackend_admin_files_$fileId(props: {
  admin: AdminPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, fileId } = props;
  // 1. Find file by id
  const file = await MyGlobal.prisma.shopping_mall_ai_backend_files.findFirst({
    where: { id: fileId },
  });
  if (!file) throw new Error("File not found");
  if (file.deleted_at !== null) throw new Error("File already deleted");
  // 2. Soft-delete by setting deleted_at to current time in ISO8601 format
  await MyGlobal.prisma.shopping_mall_ai_backend_files.update({
    where: { id: fileId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
