import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the full business details for a single codebook entry (such as a
 * specific status or option) by codebookId and entryId.
 *
 * The operation reads from the shopping_mall_ai_backend_codebook_entries table
 * and returns all attributes for the entry, supporting admin and system-level
 * dictionary inspection. Soft-deleted records (deleted_at != null) are
 * excluded. Only admins may access this endpoint.
 *
 * @param props - Operation properties
 * @param props.admin - The authenticated admin making the request
 *   (authorization enforced)
 * @param props.codebookId - The UUID of the parent codebook for the entry
 * @param props.entryId - The UUID of the specific entry to fetch
 * @returns The complete detail for the specified codebook entry, including
 *   business and context metadata
 * @throws {Error} When no such record exists (not found or deleted)
 */
export async function get__shoppingMallAiBackend_admin_codebooks_$codebookId_entries_$entryId(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
  entryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCodebookEntry> {
  const { admin, codebookId, entryId } = props;
  const entry =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.findFirst({
      where: {
        id: entryId,
        shopping_mall_ai_backend_codebook_id: codebookId,
        deleted_at: null,
      },
    });
  if (!entry) throw new Error("Codebook entry not found");
  return {
    id: entry.id,
    shopping_mall_ai_backend_codebook_id:
      entry.shopping_mall_ai_backend_codebook_id,
    code: entry.code,
    label: entry.label,
    description: entry.description ?? null,
    order: entry.order,
    visible: entry.visible,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
    deleted_at: entry.deleted_at ? toISOStringSafe(entry.deleted_at) : null,
  };
}
