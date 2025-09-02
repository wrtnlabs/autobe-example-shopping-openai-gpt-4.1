import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the metadata (name and/or description) of an existing codebook entity
 * by its UUID.
 *
 * Admins can use this endpoint to maintain accurate, auditable codebook
 * metadata. The codebook's business code and ID are immutable; only
 * name/description may be changed.
 *
 * Strict admin authorization is enforced by controller/parameter decorator, so
 * only verified admin accounts may update codebooks.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the update
 * @param props.codebookId - Target codebook's UUID
 * @param props.body - New values for name and/or description (only supplied
 *   fields updated)
 * @returns The updated codebook entity (all core fields)
 * @throws {Error} If codebook is not found (non-existent or deleted)
 * @throws {Error} If a unique constraint is violated when updating name
 */
export async function put__shoppingMallAiBackend_admin_codebooks_$codebookId(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCodebook.IUpdate;
}): Promise<IShoppingMallAiBackendCodebook> {
  const { admin, codebookId, body } = props;
  // Ensure codebook exists and is not soft-deleted
  const codebook =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.findFirst({
      where: {
        id: codebookId,
        deleted_at: null,
      },
    });
  if (!codebook) {
    throw new Error("Codebook not found");
  }
  // Prepare timestamp for audit/evidence (updated_at)
  const now = toISOStringSafe(new Date());
  try {
    const updated =
      await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.update({
        where: { id: codebookId },
        data: {
          name: body.name ?? undefined,
          description: body.description ?? undefined,
          updated_at: now,
        },
      });
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } catch (error) {
    // Will throw on unique constraint for name or other DB errors
    throw error;
  }
}
