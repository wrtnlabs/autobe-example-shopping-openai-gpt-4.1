import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Add a new entry to a codebook by its codebookId.
 *
 * Creates a new entry within a given codebook, allowing administrators to
 * expand or manage business logic dictionaries. Written to the
 * shopping_mall_ai_backend_codebook_entries table and requires the parent
 * codebook's UUID (codebookId) and entry details. Enforces uniqueness of code
 * within the codebook and validates for business completeness. Only accessible
 * to admin-level users.
 *
 * @param props - Admin: AdminPayload — Authenticated system operator
 *   codebookId: string & tags.Format<'uuid'> — UUID of the parent codebook
 *   body: IShoppingMallAiBackendCodebookEntry.ICreate — code, label,
 *   description, optional order/visible
 * @returns Newly created codebook entry details
 *   (IShoppingMallAiBackendCodebookEntry)
 * @throws {Error} When a code with the same value already exists in this
 *   codebook (uniqueness violation)
 */
export async function post__shoppingMallAiBackend_admin_codebooks_$codebookId_entries(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCodebookEntry.ICreate;
}): Promise<IShoppingMallAiBackendCodebookEntry> {
  const { admin, codebookId, body } = props;

  // Authorization: contract is enforced by presence of admin parameter

  // Uniqueness check for code within codebook, must not be soft-deleted
  const exists =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.findFirst({
      where: {
        shopping_mall_ai_backend_codebook_id: codebookId,
        code: body.code,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (exists)
    throw new Error(
      "Duplicate code: code must be unique within this codebook.",
    );

  // Determine order (auto-increment after max if not given)
  let orderValue = body.order ?? null;
  if (orderValue === null || orderValue === undefined) {
    const max =
      await MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.aggregate(
        {
          where: {
            shopping_mall_ai_backend_codebook_id: codebookId,
            deleted_at: null,
          },
          _max: { order: true },
        },
      );
    orderValue = (max._max.order ?? 0) + 1;
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_codebook_id: codebookId,
        code: body.code,
        label: body.label,
        description: body.description ?? null,
        order: orderValue,
        visible: body.visible ?? true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_ai_backend_codebook_id:
      created.shopping_mall_ai_backend_codebook_id,
    code: created.code,
    label: created.label,
    description: created.description,
    order: created.order,
    visible: created.visible,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
