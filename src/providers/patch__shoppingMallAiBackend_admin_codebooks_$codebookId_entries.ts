import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";
import { IPageIShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebookEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, searchable list of all entries within a given codebook.
 *
 * Entries correspond to the detailed options, statuses, or values that form the
 * codebook's dictionary. Supports searching, sorting, and filtering by entry
 * code, label, order, and visibility. All results are scoped to the specified
 * codebook via its codebookId. This operation leverages the
 * shopping_mall_ai_backend_codebook_entries table and supports admin-level
 * codebook configuration workflows.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.codebookId - UUID of the codebook to list entries for
 * @param props.body - Filter and pagination info for codebook entries
 *   (IShoppingMallAiBackendCodebookEntry.IRequest)
 * @returns Paginated summary of codebook entries
 *   (IPageIShoppingMallAiBackendCodebookEntry.ISummary)
 * @throws {Error} If the underlying query fails
 */
export async function patch__shoppingMallAiBackend_admin_codebooks_$codebookId_entries(props: {
  admin: AdminPayload;
  codebookId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCodebookEntry.IRequest;
}): Promise<IPageIShoppingMallAiBackendCodebookEntry.ISummary> {
  const { codebookId, body } = props;

  // Build where clause including only provided filters (excluding null)
  const where = {
    shopping_mall_ai_backend_codebook_id: codebookId,
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.label !== undefined &&
      body.label !== null && {
        label: { contains: body.label, mode: "insensitive" as const },
      }),
    ...(body.order !== undefined &&
      body.order !== null && { order: body.order }),
    ...(body.visible !== undefined &&
      body.visible !== null && { visible: body.visible }),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const [entries, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.findMany({
      where,
      orderBy: [{ order: "asc" }, { created_at: "desc" }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_codebook_entries.count({ where }),
  ]);

  const results = entries.map((entry) => ({
    id: entry.id,
    code: entry.code,
    label: entry.label,
    visible: entry.visible,
    order: entry.order,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results,
  };
}
