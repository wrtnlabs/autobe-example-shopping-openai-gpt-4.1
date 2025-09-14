import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProduct";
import { IAiCommercePageIFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIFavoritesProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and paginate a user's product favorites
 * (ai_commerce_favorites_products table).
 *
 * Allows authenticated sellers to retrieve a paginated, filtered, and
 * optionally sorted list of their product favorites for display, organization,
 * and further action. Supports filtering by product, label, folder, and
 * created_at date range. Pagination and sorting are fully supported. The query
 * is always scoped to favorites owned by the current seller.
 *
 * @param props - The input parameters containing seller authentication payload
 *   and the request body with filtering, sorting, and pagination options.
 * @param props.seller - Authenticated seller's JWT payload with user id.
 * @param props.body - Request body conforming to
 *   IAiCommerceFavoritesProduct.IRequest (pagination, filter, sort).
 * @returns IAiCommercePageIFavoritesProduct.ISummary containing matching
 *   favorites and pagination info.
 * @throws {Error} For Prisma/database errors; input validity is assumed by
 *   contract.
 */
export async function patchaiCommerceSellerFavoritesProducts(props: {
  seller: SellerPayload;
  body: IAiCommerceFavoritesProduct.IRequest;
}): Promise<IAiCommercePageIFavoritesProduct.ISummary> {
  const { seller, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Only allow sort fields that map to selected properties
  const allowedSorts = ["created_at", "label"] as const;
  const sortField =
    body.sort &&
    allowedSorts.includes(body.sort as (typeof allowedSorts)[number])
      ? body.sort
      : "created_at";
  // Allow only 'asc' or 'desc' for order
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Build created_at range if needed
  let createdAtRange: { gte?: string; lte?: string } | undefined;
  if (body.created_from !== undefined && body.created_from !== null) {
    createdAtRange = { ...createdAtRange, gte: body.created_from };
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    createdAtRange = { ...createdAtRange, lte: body.created_to };
  }

  // WHERE clause construction with strict undefined/null distinctions
  const where = {
    user_id: seller.id,
    deleted_at: null,
    ...(body.product_id !== undefined &&
      body.product_id !== null && {
        product_id: body.product_id,
      }),
    ...(body.folder_id !== undefined &&
      body.folder_id !== null && {
        folder_id: body.folder_id,
      }),
    ...(body.label !== undefined &&
      body.label !== null && {
        label: body.label,
      }),
    ...(createdAtRange !== undefined && { created_at: createdAtRange }),
  };

  // ORDER BY clause inline
  const orderBy = { [sortField]: sortOrder };

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_products.count({ where }),
    MyGlobal.prisma.ai_commerce_favorites_products.findMany({
      where,
      orderBy,
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

  const data = rows.map((row) => {
    // label and folder_id are optional+nullable, preserve null if present
    return {
      id: row.id,
      product_id: row.product_id,
      label: row.label ?? undefined,
      folder_id: row.folder_id ?? undefined,
      snapshot_id: row.snapshot_id,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  return {
    total,
    page,
    limit,
    data,
  };
}
