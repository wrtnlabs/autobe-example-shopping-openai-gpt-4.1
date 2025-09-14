import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { IPageIAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesFolder";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and retrieve favorite folders for the authenticated user
 * (ai_commerce_favorites_folders).
 *
 * Returns a list of organizational folders (used for favorites) for the
 * currently authenticated buyer. Supports filtering by folder name (substring),
 * sorting by permitted fields, and paginated listing. Only returns folders
 * belonging to the current user and not soft-deleted.
 *
 * Pagination and sorting follow business rules: default sort by creation date
 * descending, default page=1 and limit=20. Only the folder's summary fields are
 * returned; user ownership is enforced by query, not in the response. Compliant
 * with privacy and organizational business logic.
 *
 * @param props - Buyer: BuyerPayload for the authenticated user (UUID
 *   identification) body: IAiCommerceFavoritesFolder.IRequest
 *   paginated/sortable folder search criteria
 * @returns Paginated folder summaries in line with
 *   IPageIAiCommerceFavoritesFolder.ISummary
 * @throws {Error} If authentication fails or Prisma errors occur (unlikely,
 *   handled globally)
 */
export async function patchaiCommerceBuyerFavoritesFolders(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesFolder.IRequest;
}): Promise<IPageIAiCommerceFavoritesFolder.ISummary> {
  const { buyer, body } = props;
  // Pagination and limit defaults; ensure results are always at least page=1, limit=20 if not provided
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Parse sort, restrict to only allowed fields and directions
  const allowedSortFields = ["name", "created_at", "updated_at"];
  let sortField: "name" | "created_at" | "updated_at" = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const [fieldRaw, orderRaw] = body.sort.trim().split(/\s+/);
    if (
      typeof fieldRaw === "string" &&
      typeof orderRaw === "string" &&
      allowedSortFields.includes(fieldRaw) &&
      (orderRaw === "asc" || orderRaw === "desc")
    ) {
      sortField = fieldRaw as typeof sortField;
      sortOrder = orderRaw;
    }
  }

  // All queries strictly scoped by buyer; only non-deleted
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_folders.findMany({
      where: {
        user_id: buyer.id,
        deleted_at: null,
        ...(body.name !== undefined && {
          name: { contains: body.name },
        }),
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_favorites_folders.count({
      where: {
        user_id: buyer.id,
        deleted_at: null,
        ...(body.name !== undefined && {
          name: { contains: body.name },
        }),
      },
    }),
  ]);

  // Map to ISummary, normalize description (optional+nullable) and all dates/times
  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(limit) > 0 ? Math.ceil(total / Number(limit)) : 0,
    },
    data,
  };
}
