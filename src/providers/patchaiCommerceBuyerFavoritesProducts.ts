import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProduct";
import { IAiCommercePageIFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIFavoritesProduct";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Search and paginate a user's product favorites
 * (ai_commerce_favorites_products table).
 *
 * This operation allows an authenticated buyer to search, filter, and paginate
 * their own product favorites. Filtering supports product_id, label, folder_id,
 * and created_at date ranges. Sorting is limited to whitelisted fields
 * (created_at, label). Results are always scoped to the calling buyer, exclude
 * soft-deleted records, and are returned in paginated summary format for
 * efficient UI consumption.
 *
 * @param props - Object containing the authenticated buyer and search/filter
 *   params
 * @param props.buyer - The authenticated buyer payload (role: buyer)
 * @param props.body - Request filter, sort, and pagination fields
 * @returns Paginated summary result of the buyer's favorite products
 * @throws {Error} If any database error occurs during search
 */
export async function patchaiCommerceBuyerFavoritesProducts(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesProduct.IRequest;
}): Promise<IAiCommercePageIFavoritesProduct.ISummary> {
  const { buyer, body } = props;

  // Page and limit with typia/DTO compliant types
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Allowed sort fields strictly as literals for safe orderBy
  const allowedSort = ["created_at", "label"] as const;
  type AllowedSort = (typeof allowedSort)[number];

  // Pick sort field if valid, else fallback
  let sortField: AllowedSort = "created_at";
  if (
    typeof body.sort === "string" &&
    (allowedSort as readonly string[]).includes(body.sort)
  ) {
    sortField = body.sort as AllowedSort;
  }
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build filter (where clause) with null/undefined handling
  const where = {
    user_id: buyer.id,
    deleted_at: null,
    ...(body.product_id !== undefined &&
      body.product_id !== null && { product_id: body.product_id }),
    ...(body.label !== undefined &&
      body.label !== null && { label: body.label }),
    ...(body.folder_id !== undefined &&
      body.folder_id !== null && { folder_id: body.folder_id }),
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined &&
          body.created_from !== null && { gte: body.created_from }),
        ...(body.created_to !== undefined &&
          body.created_to !== null && { lte: body.created_to }),
      },
    }),
  };

  // Prisma queries (no intermediate variables)
  const [total, favorites] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_products.count({ where }),
    MyGlobal.prisma.ai_commerce_favorites_products.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        product_id: true,
        label: true,
        folder_id: true,
        snapshot_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  // Map to DTO, handling type and optional/null conversion
  const data = favorites.map((fav) => ({
    id: fav.id,
    product_id: fav.product_id,
    label: fav.label === null ? undefined : fav.label,
    folder_id: fav.folder_id === null ? undefined : fav.folder_id,
    snapshot_id: fav.snapshot_id,
    created_at: toISOStringSafe(fav.created_at),
    updated_at: toISOStringSafe(fav.updated_at),
  }));

  return {
    total: Number(total),
    page: Number(page),
    limit: Number(limit),
    data,
  };
}
