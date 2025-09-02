import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the details of a single business codebook by its unique identifier.
 *
 * Reads all business and administrative fields for a codebook record, strictly
 * limited to records not soft-deleted (`deleted_at: null`). This is an
 * admin-only endpoint; no codebook ownership filtering is performed—all admins
 * may access any codebook's detail.
 *
 * @param props - Operation parameters
 * @param props.admin - Authenticated admin payload
 * @param props.codebookId - The unique identifier (UUID) of the target codebook
 * @returns The codebook detail record with all attributes including
 *   creation/update/deletion timestamps
 * @throws {Error} If no codebook with the specified ID exists or is
 *   soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_codebooks_$codebookId(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCodebook> {
  const { admin, codebookId } = props;

  const codebook =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.findFirst({
      where: {
        id: codebookId,
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!codebook) throw new Error("Codebook not found");

  return {
    id: codebook.id,
    code: codebook.code,
    name: codebook.name,
    description: codebook.description,
    created_at: toISOStringSafe(codebook.created_at),
    updated_at: toISOStringSafe(codebook.updated_at),
    deleted_at:
      codebook.deleted_at !== null
        ? toISOStringSafe(codebook.deleted_at)
        : null,
  };
}
