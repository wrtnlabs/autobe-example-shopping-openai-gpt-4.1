import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-deletes a codebook by its UUID, retaining for audit/evidence.
 *
 * Permanently deactivates (soft-deletes) a codebook in the system by marking
 * the deleted_at timestamp. This prevents further business use but retains the
 * record for evidence, audit, and compliance. Only admins can perform this
 * action due to its critical system impact on business rules and references.
 *
 * @param props - Request properties.
 * @param props.admin - The authenticated admin performing the operation (must
 *   be active and enrolled; enforced by decorator).
 * @param props.codebookId - The unique identifier (UUID) of the codebook to
 *   soft-delete.
 * @returns Void
 * @throws {Error} When the codebook does not exist or has already been deleted
 *   (idempotent violation or not found).
 */
export async function delete__shoppingMallAiBackend_admin_codebooks_$codebookId(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, codebookId } = props;

  // Find the codebook; ensure it's not already soft-deleted
  const codebook =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.findFirst({
      where: {
        id: codebookId,
        deleted_at: null,
      },
    });

  if (!codebook) {
    throw new Error("Codebook not found or already deleted");
  }

  // Soft-delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.update({
    where: { id: codebookId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
