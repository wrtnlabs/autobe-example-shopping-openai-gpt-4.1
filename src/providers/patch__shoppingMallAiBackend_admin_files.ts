import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";
import { IPageIShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and paginate file metadata records on shopping_mall_ai_backend_files.
 *
 * Retrieve a paginated and filtered list of uploaded file metadata from across
 * the platform. This operation allows administrators to search files based on
 * file type, uploader, unique storage URI, file name patterns, or upload date
 * ranges. The search results are used for compliance reviews, evidence
 * management, and platform-wide content governance.
 *
 * Only admin users may use this endpoint due to sensitivity of file access and
 * potential privacy concerns. The operation respects logical deletion
 * (deleted_at); by default, it only returns active files unless filters for
 * deleted items are included. Bulk export or legal production workflows may
 * require this API.
 *
 * Results include file URI, original filename, uploader, content type, file
 * size, and upload timestamp for each record, supporting traceability and
 * operational maintenance.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 *   (authorization required)
 * @param props.body - Complex criteria for searching or paginating file
 *   metadata
 * @returns Paginated list of file metadata entries fitting the search query
 * @throws {Error} When invalid sort field, invalid pagination values, or
 *   invalid date filter are provided
 */
export async function patch__shoppingMallAiBackend_admin_files(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendFile.IRequest;
}): Promise<IPageIShoppingMallAiBackendFile.ISummary> {
  const { body } = props;
  const {
    original_filename,
    mime_type,
    uploaded_by_id,
    uploaded_at_from,
    uploaded_at_to,
    deleted,
    page,
    limit,
    sort,
  } = body;

  // Parse and validate pagination
  const pageNumber: number = typeof page === "number" && page >= 1 ? page : 1;
  const pageSize: number =
    typeof limit === "number" && limit >= 1 && limit <= 500 ? limit : 20;
  const skip = (pageNumber - 1) * pageSize;

  // Build Prisma where condition
  const where = {
    ...(deleted === true
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(uploaded_by_id !== undefined &&
    uploaded_by_id !== null &&
    uploaded_by_id.length > 0
      ? { uploaded_by_id }
      : {}),
    ...(mime_type !== undefined && mime_type !== null && mime_type.length > 0
      ? { mime_type }
      : {}),
    ...(original_filename !== undefined &&
    original_filename !== null &&
    original_filename.length > 0
      ? {
          original_filename: {
            contains: original_filename,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...((uploaded_at_from !== undefined && uploaded_at_from !== null) ||
    (uploaded_at_to !== undefined && uploaded_at_to !== null)
      ? {
          uploaded_at: {
            ...(uploaded_at_from !== undefined &&
              uploaded_at_from !== null && { gte: uploaded_at_from }),
            ...(uploaded_at_to !== undefined &&
              uploaded_at_to !== null && { lte: uploaded_at_to }),
          },
        }
      : {}),
  };

  // Parse sort
  const allowedSortFields = [
    "uploaded_at",
    "original_filename",
    "size_bytes",
    "mime_type",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { uploaded_at: "desc" };
  if (typeof sort === "string" && sort.includes(":")) {
    const [fieldRaw, directionRaw] = sort.split(":");
    const field = fieldRaw.trim();
    const direction = directionRaw.trim() === "asc" ? "asc" : "desc";
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: direction };
    } else {
      throw new Error(`Invalid sort field: ${field}`);
    }
  } else if (sort !== undefined && sort !== null && sort.length > 0) {
    // If sort provided but not valid
    throw new Error(
      "Invalid sort parameter format. Use field:direction (e.g., uploaded_at:desc)",
    );
  }

  // Main query (data+total)
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_files.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        size_bytes: true,
        uploaded_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_files.count({ where }),
  ]);

  // Map to ISummary structure
  const data = records.map(
    (file): IShoppingMallAiBackendFile.ISummary => ({
      id: file.id,
      original_filename: file.original_filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      uploaded_at: toISOStringSafe(file.uploaded_at),
      deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    }),
  );

  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
