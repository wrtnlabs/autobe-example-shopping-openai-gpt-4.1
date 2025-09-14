import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesFolder";
import { IPageIAiCommerceFavoritesFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesFolder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and retrieve favorite folders for the authenticated user
 * (ai_commerce_favorites_folders).
 *
 * Returns a paginated and filtered list of folders used to organize address,
 * product, and inquiry favorites for the current authenticated seller. Supports
 * searching by folder name (substring match), pagination, and sorting by name
 * or creation/update dates. Folders are strictly limited to those owned by the
 * requesting seller and not soft deleted. Returned list and pagination
 * information follow the IAiCommerceFavoritesFolder.ISummary and
 * IPageIAiCommerceFavoritesFolder.ISummary contracts.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making the request (must be
 *   validated JWT and active account)
 * @param props.body - Search, sort, and pagination criteria for folder listing
 * @returns Paginated list of folder summaries (ISummary); see
 *   IAiCommerceFavoritesFolder.ISummary for structure
 * @throws {Error} If database operations fail or authorization is violated
 *   (should never happen in normal scenario)
 */
export async function patchaiCommerceSellerFavoritesFolders(props: {
  seller: SellerPayload;
  body: IAiCommerceFavoritesFolder.IRequest;
}): Promise<IPageIAiCommerceFavoritesFolder.ISummary> {
  // 1. Parse, normalize, and clamp input parameters
  const page = Math.max(Number(props.body.page ?? 1), 1);
  const rawLimit = Number(props.body.limit ?? 10);
  const limit = rawLimit > 0 ? Math.min(rawLimit, 100) : 10; // max page size 100
  const name = props.body.name;

  // 2. Parse sorting
  let sortField: "created_at" | "updated_at" | "name" = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (props.body.sort) {
    const split = props.body.sort.trim().split(/\s+/);
    const candidateField = split[0];
    const candidateOrder = split[1]?.toLowerCase();
    if (
      candidateField === "created_at" ||
      candidateField === "updated_at" ||
      candidateField === "name"
    )
      sortField = candidateField;
    if (candidateOrder === "asc" || candidateOrder === "desc")
      sortOrder = candidateOrder;
  }

  // 3. Construct Prisma where clause - only select seller's own folders, not soft deleted
  const where = {
    user_id: props.seller.id,
    deleted_at: null,
    ...(name !== undefined && name !== null && name.length > 0
      ? { name: { contains: name } }
      : {}),
  };

  // 4. Count all items before pagination
  const total = await MyGlobal.prisma.ai_commerce_favorites_folders.count({
    where,
  });

  // 5. Query paginated, sorted data
  const rows = await MyGlobal.prisma.ai_commerce_favorites_folders.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });

  // 6. Map each row to ISummary (convert all dates with toISOStringSafe)
  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // 7. Compose pagination & result structure
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages:
        total === 0
          ? (0 as number & tags.Type<"int32"> & tags.Minimum<0>)
          : (Math.ceil(total / limit) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    },
    data,
  };
}
